import { Database } from "bun:sqlite";

const db = new Database(process.env.DB_FILE_NAME!, { create: true });

const iamTable = 'iam';

const obtainedPetsTable = 'obtainedPets';

export class IamTableEntry {
    discordId: string;
    osrsName: string;

    constructor(discordId: string, osrsName: string) {
        this.discordId = discordId;
        this.osrsName = osrsName;
    }
}

export class ObtainedPetsTableEntry {
    discordId: string;
    petId: number;

    constructor(discordId: string, petId: number) {
        this.discordId = discordId;
        this.petId = petId;
    }
}

/**
 * Opens the bun:sqlite database.
 * 
 * Missing tables are created.
 */
export function openDatabase() {
    db.run(
        `CREATE TABLE IF NOT EXISTS ${iamTable} (discordId TEXT NOT NULL, osrsName TEXT NOT NULL, PRIMARY KEY (discordId))`,
    );

    db.run(
        `CREATE TABLE IF NOT EXISTS ${obtainedPetsTable} (discordId TEXT NOT NULL, petId INTEGER NOT NULL, PRIMARY KEY (discordId, petId))`,
    );
}

/**
 * Writes an "iam" entry.
 * 
 * @param discordId The discord user's id
 * @param osrsName The discord user's osrs name
 */
export function addIamEntry(discordId: string, osrsName: string) {
    db.run(
        `INSERT OR REPLACE INTO ${iamTable} (discordId, osrsName) VALUES ("${discordId}", "${osrsName}")`,
    );
}

/**
 * Reads an "iam" entry.
 * 
 * @param discordId The discord user's id
 * @returns The "iam" table entry
 */
export function getIamEntry(discordId: string): IamTableEntry | null {
    const result = db.query(
        `SELECT * FROM ${iamTable} WHERE discordId = "${discordId}"`,
    ).get();

    if (result != null) {
        return result as IamTableEntry;
    }

    return null;
}

/**
 * Writes an "obtained pet" entry.
 * 
 * @param discordId The discord user's id
 * @param petId The pet id (as seen in ./assets/data/pets.json)
 */
export function addObtainedPetEntry(discordId: string, petId: number) {
    db.run(
        `INSERT OR REPLACE INTO ${obtainedPetsTable} (discordId, petId) VALUES ("${discordId}", "${petId}")`,
    );
}

/**
 * Removes an "obtained pet" entry.
 * 
 * @param discordId The discord user's id
 * @param petId The pet id (as seen in ./assets/data/pets.json)
 */
export function removeObtainedPetEntry(discordId: string, petId: number) {
    db.run(
        `DELETE FROM ${obtainedPetsTable} WHERE discordId = "${discordId}" AND petId = "${petId}"`,
    );
}

/**
 * Reads an "iam" entry.
 * 
 * @param discordId The discord user's id
 * @returns The "iam" table entry
 */
export function getAllObtainedPetEntries(discordId: string): Array<ObtainedPetsTableEntry> {
    const result = db.query(
        `SELECT * FROM ${obtainedPetsTable} WHERE discordId = "${discordId}"`,
    ).all();

    if (result != null) {
        return result as Array<ObtainedPetsTableEntry>;
    }

    return [];
}
