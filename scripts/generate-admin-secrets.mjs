import {
    pbkdf2Sync,
    randomBytes
} from "node:crypto";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";


const ITERATIONS = 210000;
const HASH_LENGTH = 32;
const HASH_ALGORITHM = "sha256";


function createPasswordHash(password) {
    const salt = randomBytes(16);

    const hash = pbkdf2Sync(
        password,
        salt,
        ITERATIONS,
        HASH_LENGTH,
        HASH_ALGORITHM
    );

    return [
        "pbkdf2_sha256",
        ITERATIONS,
        salt.toString("base64url"),
        hash.toString("base64url")
    ].join("$");
}


function createSessionSecret() {
    return randomBytes(48).toString("base64url");
}


async function main() {
    const readline = createInterface({
        input: stdin,
        output: stdout
    });

    try {
        const password = await readline.question(
            "Enter the CMS admin password: "
        );

        const confirmedPassword = await readline.question(
            "Confirm the CMS admin password: "
        );

        if (!password) {
            throw new Error(
                "The password cannot be empty."
            );
        }

        if (password !== confirmedPassword) {
            throw new Error(
                "The passwords do not match."
            );
        }

        const passwordHash = createPasswordHash(password);
        const sessionSecret = createSessionSecret();

        console.log("\nGenerated environment variables:\n");

        console.log(
            `CMS_ADMIN_PASSWORD_HASH=${passwordHash}`
        );

        console.log(
            `CMS_SESSION_SECRET=${sessionSecret}`
        );

        console.log(
            "\nStore these values securely. " +
            "Do not commit them to Git."
        );
    } finally {
        readline.close();
    }
}


main().catch((error) => {
    console.error(`\nError: ${error.message}`);
    process.exitCode = 1;
});