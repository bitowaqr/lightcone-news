export const extractJsonFromString = (text) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  try { 
    const parsedJson = JSON.parse(text);
    if (typeof parsedJson === 'object' && parsedJson !== null) {
      return parsedJson;
    }
  } catch (error) {
    // Do nothing
  }
  
  try {
    // First try to find JSON in code blocks with ```json format
    const codeBlockRegex = /```json\s*([^]*?)```/;
    const codeBlockMatch = text.match(codeBlockRegex);
    
    if (codeBlockMatch && codeBlockMatch[1]) {
      const potentialJsonString = codeBlockMatch[1].trim();
      const parsedJson = JSON.parse(potentialJsonString);
      if (typeof parsedJson === 'object' && parsedJson !== null) {
        return parsedJson;
      }
    }
    
    // Fallback to looking for JSON object pattern if no code block found
    const jsonRegex = /{[^]*?}/; // Non-greedy match for content between braces
    const match = text.match(jsonRegex);

    if (!match) {
      // No matching JSON object found
      return null;
    }

    const potentialJsonString = match[0];

    // Attempt to parse the extracted string
    const parsedJson = JSON.parse(potentialJsonString);
    // Basic check if it's an object (as the regex implies)
    if (typeof parsedJson === 'object' && parsedJson !== null) {
      return parsedJson;
    }
    
    // If we get here, we found something that parsed but wasn't an object
    // Try to find the first and last curly brackets in the text
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      const fullJsonString = text.substring(firstBrace, lastBrace + 1);
      try {
        const fullParsedJson = JSON.parse(fullJsonString);
        if (typeof fullParsedJson === 'object' && fullParsedJson !== null) {
          return fullParsedJson;
        }
      } catch (error) {
        console.error('Failed to parse the following fullJsonString:', fullJsonString);
        console.error('Original parsing error for fullJsonString:', error);
        throw new Error('Failed to parse full JSON string:', error);
      }
    }
    
    return null; // Parsed but wasn't an object as expected
  } catch (error) {
    
    // Try to find the first and last curly brackets in the text
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      const fullJsonString = text.substring(firstBrace, lastBrace + 1);
      try {
        const fullParsedJson = JSON.parse(fullJsonString);
        if (typeof fullParsedJson === 'object' && fullParsedJson !== null) {
          return fullParsedJson;
        }
      } catch (error) {
        console.error('Failed to parse the following fullJsonString:', fullJsonString);
        console.error('Original parsing error for fullJsonString:', error);
        throw new Error('Failed to parse full JSON string:', error);
      }
    }
    
    throw new Error('Failed to parse JSON string:', error);
  }
}; 


// // 4 test cases
// const str = `wlejfn qewfin{
//   "name": "John",
//   "age": 30,
//   "city": "New York"
// }
// `;

// const jsonCodeBlockStr = "Here's the data:{x:1} ```json{\"name\": \"John\",\"age\": 30,\"city\": \"New York\"}```";

// const failedJsonStr = "Here's the data:rk\"}```";
// const failedJsonStr2 = "Here's the data:rk\"{xqwedewf}}";

// const res = extractJsonFromString(str);
// console.log(res);
// const res2 = extractJsonFromString(jsonCodeBlockStr);
// console.log(res2);
// const res3 = extractJsonFromString(failedJsonStr);
// console.log(res3);
// const res4 = extractJsonFromString(failedJsonStr2);
// console.log(res4);