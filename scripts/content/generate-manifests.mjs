// scripts/content/generate-manifests.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();

const COLLECTIONS = [
    {
        name: "Health Articles",
        sourceDirectory: path.join(
            PROJECT_ROOT,
            "content",
            "articles",
            "published"
        ),
        publicDirectory: "content/articles/published",
        outputFile: path.join(
            PROJECT_ROOT,
            "data",
            "articles.json"
        ),
        include: () => true
    },
    {
        name: "Patient Stories",
        sourceDirectory: path.join(
            PROJECT_ROOT,
            "content",
            "patient-stories"
        ),
        publicDirectory: "content/patient-stories",
        outputFile: path.join(
            PROJECT_ROOT,
            "data",
            "patient-stories.json"
        ),
        include: ({ frontMatter }) => {
            return frontMatter.consent_confirmed === true;
        }
    }
];

await main();

async function main() {
    console.log("Generating content manifests...\n");

    for (const collection of COLLECTIONS) {
        await generateCollectionManifest(collection);
    }

    console.log("\nContent manifests generated successfully.");
}

async function generateCollectionManifest(collection) {
    const sourceExists = await pathExists(
        collection.sourceDirectory
    );

    if (!sourceExists) {
        throw new Error(
            `${collection.name} directory was not found: ${getRelativePath(
                collection.sourceDirectory
            )}`
        );
    }

    const filenames = await getMarkdownFiles(
        collection.sourceDirectory
    );

    const includedContent = [];

    for (const filename of filenames) {
        const sourcePath = path.join(
            collection.sourceDirectory,
            filename
        );

        const source = await fs.readFile(
            sourcePath,
            "utf8"
        );

        const parsedDocument = parseMarkdownDocument(
            source
        );

        const contentRecord = {
            filename,
            sourcePath,
            frontMatter: parsedDocument.frontMatter
        };

        if (!collection.include(contentRecord)) {
            console.log(
                `  - Skipped ${getRelativePath(sourcePath)}`
            );
            continue;
        }

        includedContent.push(contentRecord);
    }

    includedContent.sort(sortContentByDateDescending);

    const manifestEntries = includedContent.map(
        ({ filename }) => {
            return toPublicContentPath(
                collection.publicDirectory,
                filename
            );
        }
    );

    await ensureParentDirectory(
        collection.outputFile
    );

    await fs.writeFile(
        collection.outputFile,
        `${JSON.stringify(manifestEntries, null, 2)}\n`,
        "utf8"
    );

    console.log(
        `  ✓ ${collection.name}: ${manifestEntries.length} item(s) → ${getRelativePath(
            collection.outputFile
        )}`
    );
}

function parseMarkdownDocument(source) {
    const normalizedSource = source.replace(
        /^\uFEFF/,
        ""
    );

    const match = normalizedSource.match(
        /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)([\s\S]*)$/
    );

    if (!match) {
        throw new Error(
            "Missing or invalid YAML front matter."
        );
    }

    return {
        frontMatter: parseSimpleFrontMatter(
            match[1]
        ),
        body: match[2].trim()
    };
}

function parseSimpleFrontMatter(source) {
    const result = {};
    const lines = source.split(/\r?\n/);

    for (
        let index = 0;
        index < lines.length;
        index += 1
    ) {
        const line = lines[index];

        if (
            !line.trim() ||
            line.trimStart().startsWith("#")
        ) {
            continue;
        }

        const match = line.match(
            /^([A-Za-z0-9_-]+):\s*(.*)$/
        );

        if (!match) {
            throw new Error(
                `Unsupported front matter syntax on line ${
                    index + 1
                }: ${line}`
            );
        }

        const [, key, rawValue] = match;

        result[key] = parseFrontMatterValue(
            rawValue
        );
    }

    return result;
}

function parseFrontMatterValue(rawValue) {
    const value = rawValue.trim();

    if (value === "") {
        return "";
    }

    if (
        (
            value.startsWith('"') &&
            value.endsWith('"')
        ) ||
        (
            value.startsWith("'") &&
            value.endsWith("'")
        )
    ) {
        return value.slice(1, -1);
    }

    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    if (value === "null") {
        return null;
    }

    return value;
}

function sortContentByDateDescending(left, right) {
    const leftDate = String(
        left.frontMatter.date || ""
    );

    const rightDate = String(
        right.frontMatter.date || ""
    );

    const dateComparison = rightDate.localeCompare(
        leftDate
    );

    if (dateComparison !== 0) {
        return dateComparison;
    }

    return String(
        left.frontMatter.title || ""
    ).localeCompare(
        String(right.frontMatter.title || "")
    );
}

function toPublicContentPath(directory, filename) {
    return `${directory}/${filename}`.replaceAll(
        "\\",
        "/"
    );
}

async function getMarkdownFiles(directory) {
    const entries = await fs.readdir(
        directory,
        {
            withFileTypes: true
        }
    );

    return entries
        .filter((entry) => {
            return (
                entry.isFile() &&
                entry.name
                    .toLowerCase()
                    .endsWith(".md")
            );
        })
        .map((entry) => entry.name)
        .sort((left, right) => {
            return left.localeCompare(right);
        });
}

async function ensureParentDirectory(filePath) {
    await fs.mkdir(
        path.dirname(filePath),
        {
            recursive: true
        }
    );
}

async function pathExists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    }
    catch {
        return false;
    }
}

function getRelativePath(targetPath) {
    return path
        .relative(
            PROJECT_ROOT,
            targetPath
        )
        .replaceAll(
            path.sep,
            "/"
        );
}