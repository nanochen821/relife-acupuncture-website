const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";


function getRequiredEnvironmentVariable(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(
            `Missing required environment variable: ${name}`
        );
    }

    return value;
}


function getRepositoryConfig() {
    return {
        token: getRequiredEnvironmentVariable(
            "CMS_GITHUB_TOKEN"
        ),
        owner: getRequiredEnvironmentVariable(
            "CMS_GITHUB_OWNER"
        ),
        repository: getRequiredEnvironmentVariable(
            "CMS_GITHUB_REPO"
        ),
        branch: getRequiredEnvironmentVariable(
            "CMS_GITHUB_BRANCH"
        )
    };
}


function normalizeRepositoryPath(value) {
    const normalizedPath = String(value)
        .replaceAll("\\", "/")
        .replace(/^\/+/, "");

    const pathParts = normalizedPath.split("/");

    if (
        !normalizedPath ||
        pathParts.includes("..") ||
        pathParts.includes(".")
    ) {
        throw new Error(
            `Unsafe GitHub repository path: ${value}`
        );
    }

    return normalizedPath;
}


function encodeRepositoryPath(value) {
    return normalizeRepositoryPath(value)
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");
}


function createHeaders(token) {
    return {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "Content-Type": "application/json"
    };
}


export async function getRepositoryFile(filePath) {
    const config = getRepositoryConfig();
    const encodedPath = encodeRepositoryPath(filePath);

    const requestUrl = new URL(
        `${GITHUB_API_BASE_URL}/repos/` +
        `${encodeURIComponent(config.owner)}/` +
        `${encodeURIComponent(config.repository)}/` +
        `contents/${encodedPath}`
    );

    requestUrl.searchParams.set(
        "ref",
        config.branch
    );

    const response = await fetch(
        requestUrl,
        {
            method: "GET",
            headers: createHeaders(config.token)
        }
    );

    if (response.status === 404) {
        return null;
    }

    const result = await readJsonResponse(response);

    if (!response.ok) {
        throw createGitHubApiError(
            response,
            result,
            `Unable to read repository file: ${filePath}`
        );
    }

    if (
        result.type !== "file" ||
        typeof result.content !== "string"
    ) {
        throw new Error(
            `Repository path is not a file: ${filePath}`
        );
    }

    return {
        path: normalizeRepositoryPath(filePath),
        sha: result.sha,
        content: Buffer
            .from(
                result.content.replaceAll("\n", ""),
                "base64"
            )
            .toString("utf8")
    };
}

export async function listRepositoryDirectory(
    directoryPath
) {
    const config = getRepositoryConfig();

    const normalizedPath =
        normalizeRepositoryPath(directoryPath);

    const encodedPath =
        encodeRepositoryPath(normalizedPath);

    const requestUrl = new URL(
        `${GITHUB_API_BASE_URL}/repos/` +
        `${encodeURIComponent(config.owner)}/` +
        `${encodeURIComponent(config.repository)}/` +
        `contents/${encodedPath}`
    );

    requestUrl.searchParams.set(
        "ref",
        config.branch
    );

    const response = await fetch(
        requestUrl,
        {
            method: "GET",
            headers: createHeaders(config.token)
        }
    );

    if (response.status === 404) {
        return [];
    }

    const result = await readJsonResponse(response);

    if (!response.ok) {
        throw createGitHubApiError(
            response,
            result,
            `Unable to list repository directory: ${directoryPath}`
        );
    }

    if (!Array.isArray(result)) {
        throw new Error(
            `Repository path is not a directory: ${directoryPath}`
        );
    }

    return result.map((item) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        type: item.type,
        size: item.size ?? null
    }));
}

export async function createRepositoryFile({
    filePath,
    content,
    commitMessage
}) {
    const config = getRepositoryConfig();
    const normalizedPath =
        normalizeRepositoryPath(filePath);

    const existingFile = await getRepositoryFile(
        normalizedPath
    );

    if (existingFile) {
        const error = new Error(
            `Repository file already exists: ${normalizedPath}`
        );

        error.code = "FILE_ALREADY_EXISTS";
        throw error;
    }

    return putRepositoryFile({
        config,
        filePath: normalizedPath,
        content,
        commitMessage
    });
}


export async function updateRepositoryFile({
    filePath,
    content,
    commitMessage,
    expectedSha = null
}) {
    const config = getRepositoryConfig();
    const normalizedPath =
        normalizeRepositoryPath(filePath);

    let sha = expectedSha;

    if (!sha) {
        const existingFile = await getRepositoryFile(
            normalizedPath
        );

        if (!existingFile) {
            const error = new Error(
                `Repository file does not exist: ${normalizedPath}`
            );

            error.code = "FILE_NOT_FOUND";
            throw error;
        }

        sha = existingFile.sha;
    }

    return putRepositoryFile({
        config,
        filePath: normalizedPath,
        content,
        commitMessage,
        sha
    });
}

export async function deleteRepositoryFile({
    filePath,
    commitMessage,
    expectedSha = null
}) {
    const config = getRepositoryConfig();

    const normalizedPath =
        normalizeRepositoryPath(filePath);

    let sha = expectedSha;

    if (!sha) {
        const existingFile = await getRepositoryFile(
            normalizedPath
        );

        if (!existingFile) {
            const error = new Error(
                `Repository file does not exist: ${normalizedPath}`
            );

            error.code = "FILE_NOT_FOUND";
            throw error;
        }

        sha = existingFile.sha;
    }

    const encodedPath =
        encodeRepositoryPath(normalizedPath);

    const requestUrl =
        `${GITHUB_API_BASE_URL}/repos/` +
        `${encodeURIComponent(config.owner)}/` +
        `${encodeURIComponent(config.repository)}/` +
        `contents/${encodedPath}`;

    const response = await fetch(
        requestUrl,
        {
            method: "DELETE",
            headers: createHeaders(config.token),
            body: JSON.stringify({
                message: commitMessage,
                sha,
                branch: config.branch
            })
        }
    );

    const result = await readJsonResponse(response);

    if (!response.ok) {
        throw createGitHubApiError(
            response,
            result,
            `Unable to delete repository file: ${filePath}`
        );
    }

    return {
        path: normalizedPath,
        commitSha: result.commit?.sha || null,
        commitUrl: result.commit?.html_url || null
    };
}

async function putRepositoryFile({
    config,
    filePath,
    content,
    commitMessage,
    sha = null
}) {
    const encodedPath = encodeRepositoryPath(filePath);

    const requestUrl =
        `${GITHUB_API_BASE_URL}/repos/` +
        `${encodeURIComponent(config.owner)}/` +
        `${encodeURIComponent(config.repository)}/` +
        `contents/${encodedPath}`;

    const requestBody = {
        message: commitMessage,
        content: Buffer
            .from(String(content), "utf8")
            .toString("base64"),
        branch: config.branch
    };

    if (sha) {
        requestBody.sha = sha;
    }

    const response = await fetch(
        requestUrl,
        {
            method: "PUT",
            headers: createHeaders(config.token),
            body: JSON.stringify(requestBody)
        }
    );

    const result = await readJsonResponse(response);

    if (!response.ok) {
        throw createGitHubApiError(
            response,
            result,
            `Unable to write repository file: ${filePath}`
        );
    }

    return {
        path: filePath,
        sha: result.content?.sha || null,
        commitSha: result.commit?.sha || null,
        commitUrl: result.commit?.html_url || null
    };
}


async function readJsonResponse(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}


function createGitHubApiError(
    response,
    result,
    fallbackMessage
) {
    const message =
        result?.message ||
        fallbackMessage;

    const error = new Error(
        `${message} (GitHub status ${response.status})`
    );

    error.name = "GitHubApiError";
    error.status = response.status;
    error.details = result;

    return error;
}