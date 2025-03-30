import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OllamaEmbeddings } from "@langchain/ollama";
import { supabase } from '@/lib/client';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

interface MedicineData {
    'Medicine Name': string;
    'Composition': string;
    'Uses': string;
    'Side_effects': string;
    'Image URL': string;
    'Manufacturer': string;
    'Excellent Review %': string;
    'Average Review %': string;
    'Poor Review %': string;
}

async function processMedicines() {
    try {
        console.log("Starting medicine processing...");

        const embeddings = new OllamaEmbeddings({
            model: "nomic-embed-text",
            baseUrl: "http://localhost:11434"
        });

        console.log("Reading CSV files...");
        const allopathicData = fs.readFileSync('../../../../ML/Allopathic.csv', 'utf-8');
        const ayurvedicData = fs.readFileSync('../../../../ML/Ayurvedic.csv', 'utf-8');

        console.log("Parsing CSV data...");
        const allopathicRows = parse(allopathicData, { columns: true }) as MedicineData[];
        const ayurvedicRows = parse(ayurvedicData, { columns: true }) as MedicineData[];

        console.log(`Found ${allopathicRows.length} allopathic medicines and ${ayurvedicRows.length} ayurvedic medicines`);

        console.log("Processing allopathic medicines...");
        const allopathicTexts = allopathicRows.map(row => {
            return `Medicine: ${row['Medicine Name']}\nComposition: ${row['Composition']}\nUses: ${row['Uses']}\nSide Effects: ${row['Side_effects']}\nManufacturer: ${row['Manufacturer']}\nReviews - Excellent: ${row['Excellent Review %']}%, Average: ${row['Average Review %']}%, Poor: ${row['Poor Review %']}%`;
        });

        const allopathicMetadata = allopathicRows.map(row => ({
            medicine_name: row['Medicine Name']
        }));

        console.log("Storing allopathic medicines in Supabase...");
        await SupabaseVectorStore.fromTexts(
            allopathicTexts,
            allopathicMetadata,
            embeddings,
            {
                client: supabase,
                tableName: 'allopathic',
                queryName: 'match_allopathic_medicines'
            }
        );

        console.log("Processing ayurvedic medicines...");
        const ayurvedicTexts = ayurvedicRows.map(row => {
            return `Medicine: ${row['Medicine Name']}\nComposition: ${row['Composition']}\nUses: ${row['Uses']}\nSide Effects: ${row['Side_effects']}\nManufacturer: ${row['Manufacturer']}\nReviews - Excellent: ${row['Excellent Review %']}%, Average: ${row['Average Review %']}%, Poor: ${row['Poor Review %']}%`;
        });

        const ayurvedicMetadata = ayurvedicRows.map(row => ({
            medicine_name: row['Medicine Name']
        }));

        console.log("Storing ayurvedic medicines in Supabase...");
        await SupabaseVectorStore.fromTexts(
            ayurvedicTexts,
            ayurvedicMetadata,
            embeddings,
            {
                client: supabase,
                tableName: 'ayurvedic',
                queryName: 'match_ayurvedic_medicines'
            }
        );

        console.log("Successfully processed and stored all medicines!");

    } catch (error) {
        console.error('Error processing medicines:', error);
        throw error;
    }
}

processMedicines()
    .then(() => {
        console.log("Script completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
    });
