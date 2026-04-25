/**
 * G-code Converter Logic Engine
 */

class GCodeConverter {
    constructor() {
        this.rules = {
            'okuma': {
                commentStart: '(',
                commentEnd: ')',
                offsetStyle: 'okuma', // G15 H1
                forceG0: false
            },
            'mori': {
                commentStart: '(',
                commentEnd: ')',
                offsetStyle: 'fanuc', // G54
                forceG0: false
            },
            'goodwell': {
                commentStart: '(',
                commentEnd: ')',
                offsetStyle: 'fanuc', // G54
                forceG0: false
            }
        };
    }

    convert(input, fromType, toType) {
        if (!input) return "";

        const lines = input.split('\n');
        const sourceRules = this.rules[fromType] || this.rules.generic;
        const targetRules = this.rules[toType] || this.rules.generic;

        return lines.map(line => {
            let originalLine = line.trim();
            if (!originalLine) return "";

            let processedLine = originalLine;
            let changes = [];

            // 1. Handle Comments conversion
            processedLine = this.convertComments(processedLine, sourceRules, targetRules, changes);

            // 2. Standardize G-codes (e.g., G00 -> G0)
            if (targetRules.forceG0) {
                const old = processedLine;
                processedLine = processedLine.replace(/\bG00\b/gi, 'G0');
                processedLine = processedLine.replace(/\bG01\b/gi, 'G1');
                processedLine = processedLine.replace(/\bG02\b/gi, 'G2');
                processedLine = processedLine.replace(/\bG03\b/gi, 'G3');
                if (old !== processedLine) {
                    changes.push(`Simplified G-code`);
                }
            }

            // 3. Handle Work Offsets (G54-G59 vs G15 H)
            if (sourceRules.offsetStyle === 'fanuc' && targetRules.offsetStyle === 'okuma') {
                const match = processedLine.match(/G(5[4-9])/i);
                if (match) {
                    const offsetNum = parseInt(match[1]) - 53;
                    processedLine = processedLine.replace(match[0], `G15 H${offsetNum}`);
                    changes.push(`${match[0]} -> G15 H${offsetNum}`);
                }
            } else if (sourceRules.offsetStyle === 'okuma' && targetRules.offsetStyle === 'fanuc') {
                const match = processedLine.match(/G15\s+H(\d+)/i);
                if (match) {
                    const offsetNum = parseInt(match[1]) + 53;
                    if (offsetNum >= 54 && offsetNum <= 59) {
                        processedLine = processedLine.replace(match[0], `G5${offsetNum - 50}`);
                        changes.push(`${match[0]} -> G5${offsetNum - 50}`);
                    }
                }
            }

            // 4. Reference Image Specific Conversions (Fanuc <-> Okuma)
            const isToOkuma = targetRules.offsetStyle === 'okuma';
            const isFromOkuma = sourceRules.offsetStyle === 'okuma';

            if (isToOkuma && !isFromOkuma) {
                // Fanuc -> Okuma
                const map = {
                    'G70': 'G87', // Finishing Cycle
                    'G71': 'G85', // Roughing Cycle
                    'G76': 'G71', // Threading Cycle
                    'G94': 'G73', // Facing Cycle
                    'M30': 'M2'   // End of Program
                };
                for (const [fanuc, okuma] of Object.entries(map)) {
                    const regex = new RegExp(`\\b${fanuc}\\b`, 'gi');
                    if (regex.test(processedLine)) {
                        processedLine = processedLine.replace(regex, okuma);
                        changes.push(`${fanuc} -> ${okuma}`);
                    }
                }
                // Tool format: T0101 -> T010101
                if (processedLine.match(/\bT(\d{4})\b/i)) {
                    processedLine = processedLine.replace(/\bT(\d{4})\b/i, (match, p1) => {
                        const newTool = `T${p1}01`; // Assuming adding 01 for tool wear/offset
                        changes.push(`${match} -> ${newTool}`);
                        return newTool;
                    });
                }
            } else if (isFromOkuma && !isToOkuma) {
                // Okuma -> Fanuc
                const map = {
                    'G87': 'G70',
                    'G85': 'G71',
                    'G71': 'G76',
                    'G73': 'G94',
                    'M2': 'M30'
                };
                for (const [okuma, fanuc] of Object.entries(map)) {
                    const regex = new RegExp(`\\b${okuma}\\b`, 'gi');
                    if (regex.test(processedLine)) {
                        processedLine = processedLine.replace(regex, fanuc);
                        changes.push(`${okuma} -> ${fanuc}`);
                    }
                }
                // Tool format: T010101 -> T0101
                if (processedLine.match(/\bT(\d{6})\b/i)) {
                    processedLine = processedLine.replace(/\bT(\d{6})\b/i, (match, p1) => {
                        const newTool = `T${p1.substring(0, 4)}`;
                        changes.push(`${match} -> ${newTool}`);
                        return newTool;
                    });
                }
            }

            // 4. Mark changes in brackets as requested
            if (changes.length > 0) {
                // If the line already has a comment, append to it. Otherwise create new.
                const commentChar = targetRules.commentStart;
                const commentEnd = targetRules.commentEnd;
                
                // Simple implementation: just append the changes at the end in brackets
                const changeTag = ` [${changes.join(', ')}]`;
                
                // If it's a full line comment conversion, we might already have brackets/semicolons
                // For regular lines, we append.
                if (processedLine.startsWith(';')) {
                    return processedLine; // Already commented out
                }
                
                return `${processedLine}${changeTag}`;
            }

            return processedLine;
        }).join('\n');
    }

    convertComments(line, from, to, changes) {
        let result = line;
        
        // If converting from ( ) to ;
        if (from.commentStart === '(' && to.commentStart === ';') {
            const regex = /\((.*?)\)/g;
            if (regex.test(result)) {
                result = result.replace(regex, '; $1');
                changes.push(`() -> ;`);
            }
        } 
        // If converting from ; to ( )
        else if (from.commentStart === ';' && to.commentStart === '(') {
            if (result.includes(';')) {
                const parts = result.split(';');
                result = `${parts[0].trim()} (${parts[1].trim()})`.trim();
                changes.push(`; -> ()`);
            }
        }

        return result;
    }
}

window.GCodeConverter = GCodeConverter;
