
/**
 * Parses a single CSV line into an array of values, respecting double quotes.
 * Handles cases like: "REG_NUMBER,N,10,0", "Doe, John", 123
 */
export const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let start = 0;
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
            inQuotes = !inQuotes;
        } else if (line[i] === ',' && !inQuotes) {
            let field = line.substring(start, i).trim();
            // Remove surrounding quotes if present
            if (field.startsWith('"') && field.endsWith('"')) {
                field = field.substring(1, field.length - 1);
            }
            // Handle escaped double quotes ("") -> (")
            result.push(field.replace(/""/g, '"'));
            start = i + 1;
        }
    }
    
    // Add the last field
    let lastField = line.substring(start).trim();
    if (lastField.startsWith('"') && lastField.endsWith('"')) {
        lastField = lastField.substring(1, lastField.length - 1);
    }
    result.push(lastField.replace(/""/g, '"'));
    
    return result;
};

/**
 * Louisiana-specific header cleaner.
 * Requirement: "Parse the actual field name as everything before the first comma."
 * Input: "REG_NUMBER,N,10,0" -> Output: "REG_NUMBER"
 */
export const cleanLouisianaHeader = (header: string): string => {
    if (header.includes(',')) {
        return header.split(',')[0].trim();
    }
    return header.trim();
};
