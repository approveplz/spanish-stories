const OpenAI = require('openai');

const execute = async (title, description) => {
    const openai = new OpenAI({ apiKey: process.env.OPEN_AI_APIKEY });

    const plotOutline = await getPlotOutline(openai, title, description);

    const englishStory = await getEnglishStory(openai, plotOutline);
    const storyObj = JSON.parse(
        await getSpanishTranslation(openai, englishStory)
    );

    const storyHookObj = JSON.parse(
        await getStoryMetaDetails(openai, storyObj)
    );
    const responseObj = {
        ...storyObj,
        ...storyHookObj,
    };

    return responseObj;
};

// Helpers

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

const getPlotOutline = async (openai, title, description) => {
    const plotPrompt = `Create a plot outline for an exciting short story for adults learning basic English using PLOT. The outline should follow these key elements:

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

const getStoryMetaDetails = async (openai, storyObj) => {
    const storyTitle = storyObj['title']['spanish'];
    const story = storyObj['story'];

    const metaDetailsPrompt = `Given STORY_DETAILS, give me an podcast episode STORY_HOOK in one line. 
    STORY_HOOK should grab the young audience's attention and make them want to listen to the full epsiode.
    STORY_HOOK should be relevant to and tease the STORY_DETAILS.
    Respond with JSON.
    
    Make sure the story hook always starts with "In this episode," and includes the STORY_TITLE.

    EXAMPLES:
    In this episode, we bring you El Pincel Mágico, a heartwarming tale about a young artist named Mia and her magical paintbrush that brings her creations to life. 
    In this episode, discover the enchanting world of Las Estrellas Danzantes, where a brave little girl learns to dance with the stars and save her village from eternal darkness.
    
    STORY_DETAILS:
    ${story}

    STORY_TITLE:
    ${storyTitle}

    JSON_FORMAT:
    {
        'hook': '...'
    }
    `;

    const response = await generate(openai, metaDetailsPrompt, true);
    return response;
};

const getEnglishStory = async (openai, plotOutline) => {
    const englishStoryPrompt = `Act as an expert in writing captivating short stories, tasked with crafting a short story based on a given story PLOT_OUTLINE.
    This is a story to help adults learn basic English. You MUST ONLY use simple and commonly used words in the story.
    The story must weave a short and simple tale that engages listeners from the beginning and holds their interest throughout.
    Your writing should incorporate a plot that quickly unfolds in a compelling manner.
    Pay special attention to pacing, ensuring that the story progresses smoothly but quickly and keeps the listener eager to find out what happens next.
    Make sure to show, not tell.

    REQUIREMENTS:
    ONLY use simple and common words for adults learning basic English

    PLOT_OUTLINE
    ${plotOutline}
    `;

    const response = await generate(openai, englishStoryPrompt);
    return response;
};

// const dotenv = require('dotenv');
// dotenv.config();
// const test = async () => {
//     const openai = new OpenAI({ apiKey: process.env.OPEN_AI_APIKEY });
//     const plotOutline = await getPlotOutline(
//         openai,
//         'The Magic Paintbrush',
//         'A child discovers a paintbrush that brings their drawings to life and must learn how to use it responsibly'
//     );
//     console.log(plotOutline);
//     const englishStory = await getEnglishStory(openai, plotOutline);
//     console.log(englishStory);
// };

// test();

module.exports = execute;
