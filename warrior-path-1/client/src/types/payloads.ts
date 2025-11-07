export class CreatePollPayload {
    title!: string;
    description!: string;

    constructor(fields: Partial<CreatePollPayload> = {}) {
        Object.assign(this, fields);
    }
}

export class CreatePartyPayload {
    title!: string;

    constructor(fields: Partial<CreatePartyPayload> = {}) {
        Object.assign(this, fields)
    }
}

export class CreateTransferOwnerPayload {
    expected_new_owner!: Uint8Array;

    constructor(fields: Partial<CreateTransferOwnerPayload> = {}) {
        Object.assign(this, fields)
    }
}

export class VotePayload {
    vote_type!: number;

    constructor(fields: Partial<VotePayload> = {}) {
        Object.assign(this, fields)
    }
}



export const PayloadSchemas = {
    CreatePollSchema: new Map([
        [
            CreatePollPayload,
            {
                kind: "struct",
                fields: [
                    ["title", "string"],
                    ["description", "string"],
                ],
            },
        ],
    ]),

    CreatePartySchema: new Map([
        [
            CreatePartyPayload,
            {
                kind: "struct",
                fields: [
                    ["title", "string"],
                ],
            },
        ],
    ]),

    CreateTransferOwnerSchema: new Map([
        [
            CreateTransferOwnerPayload,
            {
                kind: "struct",
                fields: [
                    ["expected_new_owner", [32]],
                ],
            },
        ],
    ]),

    VoteSchema: new Map([
        [
            VotePayload,
            {
                kind: "struct",
                fields: [
                    ["vote_type", "u8"],
                ],
            },
        ],
    ]),

};