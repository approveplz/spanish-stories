const OpenAI = require('openai');

const execute = async () => {
    const openai = new OpenAI({ apiKey: process.env.OPEN_AI_APIKEY });

    // const plotOutline = await getPlotOutline(openai);
    const plotOutline = await getPlotOutline(
        openai,
        'The Magic Paintbrush',
        'A child discovers a paintbrush that brings their drawings to life and must learn how to use it responsibly'
    );
    const englishStory = await getEnglishStory(openai, plotOutline);
    const spanishTranslation = await getSpanishTranslation(
        openai,
        englishStory
    );

    return spanishTranslation;
};

// const getPlotOutline = async (openai) => {
//     const plotPrompt = `Create a plot outline for an short, exciting fairy tale suitable for children. The outline should follow these key elements:

// 	1.	Opening Hook: Start with an exciting event or detail that grabs attention immediately.
// 	2.	Main Characters: Describe the main character (hero/heroine) and any important supporting characters.
// 	3.	Setting: Briefly describe the main setting of the story.
// 	4.	Inciting Incident: Explain the event that sets the story in motion.
// 	5.	Main Conflict: Outline the central problem or challenge the hero must overcome.
// 	6.	Rising Action: Include key events or challenges the hero faces while trying to resolve the main conflict.
// 	7.	Climax: Describe the most intense or critical moment in the story.
// 	8.	Resolution: Explain how the conflict is resolved.
// 	9.	Conclusion: End with a final takeaway or meaningful resolution for the characters.`;

//     const response = await generate(openai, plotPrompt);
//     console.log(response);
//     return response;
// };

const getPlotOutline = async (openai, title, description) => {
    const plotPrompt = `Create a plot outline for an short, exciting fairy tale suitable for children using PLOT. The outline should follow these key elements:

	1.	Opening Hook: Start with an exciting event or detail that grabs attention immediately.
	2.	Main Characters: Describe the main character (hero/heroine) and any important supporting characters.
	3.	Setting: Briefly describe the main setting of the story.
	4.	Inciting Incident: Explain the event that sets the story in motion.
	5.	Main Conflict: Outline the central problem or challenge the hero must overcome.
	6.	Rising Action: Include key events or challenges the hero faces while trying to resolve the main conflict.
	7.	Climax: Describe the most intense or critical moment in the story.
	8.	Resolution: Explain how the conflict is resolved.
	9.	Conclusion: End with a final takeaway or meaningful resolution for the characters.
    
    TITLE:
    ${title}

    PLOT:
    ${description}
    `;

    const response = await generate(openai, plotPrompt);
    console.log(response);
    return response;
};

const getSpanishTranslation = async (openai, englishStory) => {
    const spanishTranslationPrompt = `Translate this STORY into LATAM Spanish at the A1 or A2 level sentence by sentence. Use common words.
    Create an array of JSON objects including the english and spanish text, where each line is it's own JSON object.

    JSON FORMAT
    {'english': 'ENGLISH_TEXT', 'spanish': 'SPANISH_TEXT'}

    RESPONSE_FORMAT:
    {
        'title': {...},
        'story': [...]
    }

    STORY
    ${englishStory}
    `;

    const response = await generate(openai, spanishTranslationPrompt, true);
    console.log(response);
    return response;
};

const getEnglishStory = async (openai, plotOutline) => {
    // const englishStoryPrompt = `Create an exciting and fully fleshed out fairy tale at the A2 level by using points from the PLOT_OUTLINE. Use common words. Do not include any special formating. Start the story with an engaging title.

    const englishStoryPrompt = `Act as an expert in writing captivating children stories, tasked with crafting a young children's story based on a given story PLOT_OUTLINE.
    Use simple and common words in the story. This is a story for young children.
    The story must weave a short and simple tale that engages children from the beginning and holds their interest throughout.
    Your writing should incorporate a plot that quickly unfolds in a compelling manner.
    Pay special attention to pacing, ensuring that the story progresses smoothly but quickly and keeps the reader eager to find out what happens next.
    Use simple language and common words.

    PLOT_OUTLINE
    ${plotOutline}
    `;

    const response = await generate(openai, englishStoryPrompt);
    console.log(response);
    return response;
};

const generate = async (openai, userPrompt, jsonOutput = false) => {
    const modelName = 'gpt-4o';
    const systemPrompt = `You are an expert story teller`;

    const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
            {
                role: 'system',
                content: systemPrompt,
            },
            {
                role: 'user',
                content: userPrompt,
            },
        ],
        ...(jsonOutput && { response_format: { type: 'json_object' } }),
    });

    const response = completion.choices[0].message.content;
    return response;
};

module.exports = execute;
