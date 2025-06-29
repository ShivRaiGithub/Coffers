import { Character, Clients, defaultCharacter, ModelProviderName } from "@elizaos/core";
import getActivityPlugin from "./custom-plugins/index.ts";

export const character: Character = {
    ...defaultCharacter,
    // name: "Eliza", // Uncomment and set a specific name if you want to override the default
    plugins: [getActivityPlugin],
    clients: [Clients.TWITTER],
    modelProvider: ModelProviderName.GOOGLE,
    settings: {
        ...defaultCharacter.settings, // <--- IMPORTANT: Spread default settings first
        secrets: {},
        voice: {
            model: "en_US-hfc_female-medium",
        },
        chains: {
            "evm": ["sepolia"] // Changed to sepolia for GetActivity contract
        },
        // ADD OR OVERRIDE THE MODEL HERE:
        model: "gemini-1.5-flash", // <--- THIS IS THE LINE TO ADD/CHANGE!
        // You can also add other model-specific settings here if needed, e.g.:
        // temperature: 0.7,
        // maxOutputTokens: 2048,
    },
    
};