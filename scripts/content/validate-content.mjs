// scripts/content/validate-content.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();

const CONTENT_COLLECTIONS = [
    {
        name: "Health Articles",
        directory: path.join(
            PROJECT_ROOT,
            "content",
            "articles",
            "published"
        ),
        requiredFields: [
            "title",
            "date",
            "category",
            "author",
            "summary",
            "featured"
        ],
        validate: validateArticle
    },
    {
        name: "Patient Stories",
        directory: path.join(
            PROJECT_ROOT,
            "content",
            "patient-stories"
        ),
        requiredFields: [
            "title",
            "date",
            "identity_display",
            "treatment_topic",
            "summary",
            "featured",
            "consent_confirmed"
        ],
        validate: validatePatientStory
    }
];

const validationResult = {
    checkedFiles: 0,
    errors: [],
    warnings: []
};

await main();

async function main() {
    console.log("Validating website content...\n");

    for (const collection of CONTENT_COLLECTIONS) {
        await validateCollection(collection);
    }

    printValidationSummary();

    if (validationResult.errors.length > 0) {
        process.exitCode = 1;
    }
}

async function validateCollection(collection) {
    console.log(`Checking ${collection.name}:`);

    const directoryExists = await pathExists(collection.directory);

    if (!directoryExists) {
        validationResult.errors.push(
            `${collection.name}: directory not found: ${getRelativePath(
                collection.directory
            )}`
        );

        console.log("  ✗ Content directory not found.\n");
        return;
    }

    const filenames = await getMarkdownFiles(collection.directory);

    if (filenames.length === 0) {
        validationResult.warnings.push(
            `${collection.name}: no Markdown files were found.`
        );

        console.log("  ! No Markdown files found.\n");
        return;
    }

    for (const filename of filenames) {
        const filePath = path.join(collection.directory, filename);

        await validateContentFile({
            collection,
            filePath
        });
    }

    console.log("");
}

async function validateContentFile({ collection, filePath }) {
    const relativePath = getRelativePath(filePath);

    validationResult.checkedFiles += 1;

    let source;

    try {
        source = await fs.readFile(filePath, "utf8");
    }
    catch (error) {
        validationResult.errors.push(
            `${relativePath}: unable to read file: ${error.message}`
        );

        console.log(`  ✗ ${relativePath}`);
        return;
    }

    let parsedContent;

    try {
        parsedContent = parseMarkdownDocument(source);
    }
    catch (error) {
        validationResult.errors.push(
            `${relativePath}: ${error.message}`
        );

        console.log(`  ✗ ${relativePath}`);
        return;
    }

    const fileErrors = [];
    const fileWarnings = [];

    validateRequiredFields({
        frontMatter: parsedContent.frontMatter,
        requiredFields: collection.requiredFields,
        fileErrors
    });

    validateCommonFields({
        frontMatter: parsedContent.frontMatter,
        body: parsedContent.body,
        fileErrors,
        fileWarnings
    });

    collection.validate({
        frontMatter: parsedContent.frontMatter,
        fileErrors,
        fileWarnings
    });

    for (const message of fileErrors) {
        validationResult.errors.push(`${relativePath}: ${message}`);
    }

    for (const message of fileWarnings) {
        validationResult.warnings.push(`${relativePath}: ${message}`);
    }

    if (fileErrors.length > 0) {
        console.log(`  ✗ ${relativePath}`);
        return;
    }

    if (fileWarnings.length > 0) {
        console.log(`  ! ${relativePath}`);
        return;
    }

    console.log(`  ✓ ${relativePath}`);
}

function parseMarkdownDocument(source) {
    const normalizedSource = source.replace(/^\uFEFF/, "");

    const frontMatterMatch = normalizedSource.match(
        /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)([\s\S]*)$/
    );

    if (!frontMatterMatch) {
        throw new Error(
            "missing or invalid YAML front matter block."
        );
    }

    const frontMatterSource = frontMatterMatch[1];
    const body = frontMatterMatch[2].trim();

    return {
        frontMatter: parseSimpleFrontMatter(frontMatterSource),
        body
    };
}

function parseSimpleFrontMatter(source) {
    const result = {};
    const lines = source.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];

        if (!line.trim() || line.trimStart().startsWith("#")) {
            continue;
        }

        const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

        if (!match) {
            throw new Error(
                `unsupported front matter syntax on line ${index + 1}: ${line}`
            );
        }

        const [, key, rawValue] = match;

        result[key] = parseFrontMatterValue(rawValue);
    }

    return result;
}

function parseFrontMatterValue(rawValue) {
    const value = rawValue.trim();

    if (value === "") {
        return "";
    }

    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
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

function validateRequiredFields({
    frontMatter,
    requiredFields,
    fileErrors
}) {
    for (const fieldName of requiredFields) {
        if (!(fieldName in frontMatter)) {
            fileErrors.push(
                `missing required front matter field "${fieldName}".`
            );
            continue;
        }

        const value = frontMatter[fieldName];

        if (
            value === null ||
            value === undefined ||
            (
                typeof value === "string" &&
                value.trim() === ""
            )
        ) {
            fileErrors.push(
                `required field "${fieldName}" cannot be empty.`
            );
        }
    }
}

function validateCommonFields({
    frontMatter,
    body,
    fileErrors,
    fileWarnings
}) {
    if (frontMatter.date && !isValidDate(frontMatter.date)) {
        fileErrors.push(
            `"date" must use the YYYY-MM-DD format.`
        );
    }

    if (
        "featured" in frontMatter &&
        typeof frontMatter.featured !== "boolean"
    ) {
        fileErrors.push(
            `"featured" must be true or false.`
        );
    }

    if (!body) {
        fileErrors.push(
            "Markdown body cannot be empty."
        );
    }

    if (
        typeof frontMatter.summary === "string" &&
        frontMatter.summary.trim().length < 20
    ) {
        fileWarnings.push(
            `"summary" is very short; consider using at least 20 characters.`
        );
    }
}

function validateArticle({
    frontMatter,
    fileErrors
}) {
    if (
        "author" in frontMatter &&
        typeof frontMatter.author !== "string"
    ) {
        fileErrors.push(
            `"author" must be text.`
        );
    }
}

function validatePatientStory({
    frontMatter,
    fileErrors,
    fileWarnings
}) {
    const allowedIdentityDisplayValues = new Set([
        "anonymous",
        "initials",
        "first_name",
        "full_name"
    ]);

    if (
        frontMatter.identity_display &&
        !allowedIdentityDisplayValues.has(
            frontMatter.identity_display
        )
    ) {
        fileErrors.push(
            `"identity_display" must be one of: anonymous, initials, first_name, full_name.`
        );
    }

    if (
        "consent_confirmed" in frontMatter &&
        typeof frontMatter.consent_confirmed !== "boolean"
    ) {
        fileErrors.push(
            `"consent_confirmed" must be true or false.`
        );
    }

    if (frontMatter.consent_confirmed === false) {
        fileWarnings.push(
            "patient consent is not confirmed; this story must not be published publicly."
        );
    }

    if (
        frontMatter.identity_display !== "anonymous" &&
        (
            typeof frontMatter.patient_name !== "string" ||
            frontMatter.patient_name.trim() === ""
        )
    ) {
        fileErrors.push(
            `"patient_name" is required when the identity is not anonymous.`
        );
    }

    if (
        frontMatter.youtube_url &&
        !isValidYouTubeUrl(frontMatter.youtube_url)
    ) {
        fileErrors.push(
            `"youtube_url" must be a valid YouTube or youtu.be URL.`
        );
    }
}

function isValidDate(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const [year, month, day] = value
        .split("-")
        .map(Number);

    const date = new Date(
        Date.UTC(year, month - 1, day)
    );

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function isValidYouTubeUrl(value) {
    if (typeof value !== "string") {
        return false;
    }

    try {
        const url = new URL(value);

        const hostname = url.hostname
            .replace(/^www\./, "")
            .toLowerCase();

        return (
            hostname === "youtube.com" ||
            hostname === "m.youtube.com" ||
            hostname === "youtu.be" ||
            hostname === "youtube-nocookie.com"
        );
    }
    catch {
        return false;
    }
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
                entry.name.toLowerCase().endsWith(".md")
            );
        })
        .map((entry) => entry.name)
        .sort((left, right) => {
            return left.localeCompare(right);
        });
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
        .relative(PROJECT_ROOT, targetPath)
        .replaceAll(path.sep, "/");
}

function printValidationSummary() {
    console.log("Validation summary");
    console.log("------------------");
    console.log(
        `Checked files: ${validationResult.checkedFiles}`
    );
    console.log(
        `Errors: ${validationResult.errors.length}`
    );
    console.log(
        `Warnings: ${validationResult.warnings.length}`
    );

    if (validationResult.errors.length > 0) {
        console.log("\nErrors:");

        for (const error of validationResult.errors) {
            console.log(`  - ${error}`);
        }
    }

    if (validationResult.warnings.length > 0) {
        console.log("\nWarnings:");

        for (const warning of validationResult.warnings) {
            console.log(`  - ${warning}`);
        }
    }

    if (validationResult.errors.length === 0) {
        console.log("\nContent validation passed.");
    }
    else {
        console.log("\nContent validation failed.");
    }
}