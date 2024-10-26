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
	2.	Main Characters: Describe the main character (hero/heroine) and any important supporting characters. Use a few characters as possible.
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

// Scary story plot outline
// const getPlotOutline = async (openai, title, description) => {
//     const horrorPlotPrompt = `Create a horror story PLOT OUTLINE suitable for adapting into a simple English story. Focus on building fear through simple, relatable situations.

// Required Structure:

// 1. OPENING SCENE
// Create a normal, everyday situation that will turn scary. Include:
// - Main location
// - Time of day
// - What seems normal at first
// - Small hint something is wrong

// 2. MAIN CHARACTER
// Define ONE main character with:
// - Basic job or role
// - ONE key personality trait
// - ONE clear fear or weakness

// 3. SUPPORTING CHARACTERS (Maximum 2)
// For each character include:
// - Connection to main character
// - Why they are important to the story
// - When they leave the story

// 4. SETTING
// Describe ONE main location:
// - What kind of place
// - Why does it become scary

// 5. SCARY ELEMENTS
// What are the scary elements of the story?

// 6. GROWING FEAR
// List 3 events that get worse:
// - First strange thing
// - Bigger problem
// - Cannot be explained

// 7. SCARY TRUTH
// Reveal:
// - What is really happening
// - Why it targets this character

// 8. ENDING
// How does the story end? It can be a twist, a resolution, or a cliffhanger.

// RULES:
// - Use common fears everyone understands
// - Keep explanations simple
// - Build fear through strange events
// - End with clear but creepy finish

// TITLE: ${title}
// ADDITIONAL CONTEXT: ${description}

// Create a scary plot outline following these elements. Use the title and context provided, but adapt them to fit a horror story format. Focus on making it scary through atmosphere and strange events.`;

//     try {
//         const response = await generate(openai, horrorPlotPrompt);
//         console.log('Generated horror plot outline:', response);
//         return response;
//     } catch (error) {
//         console.error('Error generating horror plot outline:', error);
//         throw error;
//     }
// };

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
    STORY_HOOK should grab the audience's attention and make them want to listen to the full epsiode.
    STORY_HOOK should be relevant to and tease the STORY_DETAILS.
    Respond with JSON.
    
    Make sure the story hook always starts with "In this episode," and includes the STORY_TITLE.

    EXAMPLES:
    In this episode, we bring you El Pincel Mágico, a heartwarming tale about a young artist named Mia and her magical paintbrush that brings her creations to life. 
    In this episode, unravel the mystery of Un Perro con un Secreto Peligroso, as we follow a young boy who discovers that his newfound furry friend holds a secret that could change everything.
    
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
    Make sure to show, not tell, but remember that this is for adults learning basic English.

    REQUIREMENTS:
    - ONLY use simple and common words for adults learning basic English
    - Use common everday language
    - Use present tense when possible
    - Use short sentences
    - Use simple dialogue

    PLOT_OUTLINE
    ${plotOutline}
    `;

    const response = await generate(openai, englishStoryPrompt);
    return response;
};

// const getEnglishStory = async (openai, plotOutline) => {
//     const englishStoryPrompt = `Act as an expert in writing captivating short **horror** stories, tasked with crafting an exciting horror story based on a given story PLOT_OUTLINE.
// This is a story to help adults learn basic English. You MUST ONLY use simple and commonly used words in the story.
// The story must weave a short and simple tale that **instills suspense and fear**, engaging listeners from the beginning and holding their interest throughout.
// Your writing should incorporate a plot that quickly unfolds in a compelling and thrilling manner.
// Pay special attention to pacing, ensuring that the story progresses smoothly but quickly and keeps the listener eager to find out what happens next.
// Make sure to show, not tell, but remember that this is for adults learning basic English.

// **REQUIREMENTS:**
// - ONLY use simple and common words for adults learning basic English
// - Use common everday language
// - Focus on creating a sense of suspense and horror
// - Use present tense when possible
// - Use short sentences
// - Use simple dialogue

// **PLOT_OUTLINE**
// ${plotOutline}
// `;
//     const response = await generate(openai, englishStoryPrompt);
//     return response;
// };

// Scary story
// const getEnglishStory = async (openai, plotOutline) => {
//     const englishStoryPrompt = `You are an expert writer specializing in simple but scary stories for adults learning basic English. Follow these strict rules:

//     LANGUAGE RULES:
//     - Use ONLY the 500 most common English words
//     - Every sentence must be 12 words or less
//     - Use present tense as much as possible (Example: "He walks" not "He walked")
//     - No idioms or phrasal verbs
//     - Use basic dialogue format: "Help me!" says John. / "I am very scared," says Mary.

//     STORY STRUCTURE:
//     - Story length: Exactly 500 words
//     - Start with character and location introduction
//     - Build tension slowly with 3 scary moments
//     - End with clear resolution

//     HORROR ELEMENTS:
//     - Focus on common fears (dark, being alone, strange sounds, being followed, etc)
//     - Use basic emotion words (scared, afraid, worried, etc)
//     - Create tension through: strange sounds, darkness, being alone, being followed, being watched, being chased, being lost, etc

//     PACING (WORD COUNT):
//     1. Normal situation (50 words)
//     2. First strange thing (100 words)
//     3. Growing fear (150 words)
//     4. Main scary moment (150 words)
//     5. Resolution (50 words)

//     REQUIRED WORDS:
//     - Time: now, then, soon, later
//     - Feelings: scared, afraid, worried, nervous, trapped, hunted, etc
//     - Actions: run, hide, look, hear, scream, etc
//     - Locations: room, house, door, window, etc

//     FORMAT EXAMPLE:
//     Sarah lives alone in a small house. She works at a store. The house is old and makes strange sounds at night.

//     One night, Sarah hears a bang. She looks out her window. Nothing is there.

//     [Continue following rules above...]

//     PLOT_OUTLINE:
//     ${plotOutline}

//     Remember: Keep it SIMPLE but SCARY. Think of your readers as smart adults who are just learning English.`;
//     const response = await generate(openai, englishStoryPrompt);
//     return response;
// };

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
