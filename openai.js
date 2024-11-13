const OpenAI = require('openai');

const execute = async (title, description) => {
    const openai = new OpenAI({ apiKey: process.env.OPEN_AI_APIKEY });

    const plotOutline = await getPlotOutline(openai, title, description);

    const englishStory = await getEnglishStory(openai, plotOutline);
    console.log(englishStory);

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

/* Helpers */

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
    let nameMain = getRandomSpanishName();
    let nameSupport;

    do {
        nameSupport = getRandomSpanishName();
    } while (nameSupport === nameMain);

    const plotPrompt = `Create a plot outline for an exciting short story for adults learning basic English using PLOT. The outline should follow these key elements:

	1.	Opening Hook: Start with an exciting event or detail that grabs attention immediately.
	2.	Main Characters: Describe the main character (hero/heroine) and any important supporting characters. Use a few characters as possible. Use the name "${nameMain}" for the main character. If there is a supporting character with a name, use the name "${nameSupport}"
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
    - Use short sentences
    - Use simple dialogue

    PLOT_OUTLINE
    ${plotOutline}
    `;

    const response = await generate(openai, englishStoryPrompt);
    return response;
};

const getRandomSpanishName = () => {
    const names = [
        'Miguel',
        'Sofia',
        'Diego',
        'Isabella',
        'Alejandro',
        'Valentina',
        'Carlos',
        'Camila',
        'Javier',
        'Lucia',
        'Mateo',
        'Gabriela',
        'Antonio',
        'Elena',
        'Fernando',
        'Mariana',
        'Rafael',
        'Daniela',
        'Emilio',
        'Ana',
        'Luis',
        'Carmen',
        'Jorge',
        'Paula',
        'Pedro',
        'Laura',
        'Ricardo',
        'Andrea',
        'Manuel',
        'Beatriz',
        'Francisco',
        'Adriana',
        'Alberto',
        'Natalia',
        'Eduardo',
        'Silvia',
        'Mario',
        'Patricia',
        'Raul',
        'Monica',
        'Oscar',
        'Claudia',
        'Guillermo',
        'Rosa',
        'Sergio',
        'Julia',
        'Victor',
        'Alicia',
        'Roberto',
        'Cristina',
        'Enrique',
        'Marta',
        'Felipe',
        'Teresa',
        'Andres',
        'Pilar',
        'Ramon',
        'Isabel',
        'Jaime',
        'Susana',
        'Gustavo',
        'Carla',
        'Arturo',
        'Veronica',
        'Hector',
        'Lorena',
        'Salvador',
        'Elisa',
        'Marco',
        'Cecilia',
        'Ignacio',
        'Ines',
        'Julio',
        'Lourdes',
        'Alfredo',
        'Rocio',
        'Ernesto',
        'Catalina',
        'Hugo',
        'Esther',
        'Esteban',
        'Nuria',
        'Tomas',
        'Olga',
        'Agustin',
        'Miriam',
        'Lorenzo',
        'Yolanda',
        'Rodrigo',
        'Sonia',
        'Pablo',
        'Irene',
        'Armando',
        'Eugenia',
        'Gerardo',
        'Marisol',
        'Alvaro',
        'Consuelo',
        'Ruben',
        'Dolores',
        'Cesar',
        'Josefina',
        'Mauricio',
        'Luisa',
    ];

    return names[Math.floor(Math.random() * names.length)];
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

// const englishStory = `On a quiet night in Willow Creek, a sound wakes everyone. The alarm at the bakery rings loud. People run to see what is wrong. The bakery is empty. All the fresh bread and cakes are gone!

// Pablo, a scruffy old bloodhound, sits outside. He wags his tail, looking calm. Pablo is smart. He loves to wander the town with his nose close to the ground.

// Manuel, the kind man who owns the bakery, comes outside. He looks sad. His bakery goods were for the festival, just days away. The town needs those treats!

// Pablo sees Manuel's sadness. He decides to help. With his nose to the dirt, Pablo sniffs around the bakery. He finds a trail of crumbs and follows it.

// Pablo's journey begins. He dodges a fox playing near the forest. At the busy market, he steps away from busy feet and stays on the trail. He even outsmarts a curious alley cat that tries to block his path.

// As Pablo follows the crumbs, people in town begin to worry. They think someone from outside has taken their treats. They start to distrust strangers.

// Pablo reaches the forest. In a small clearing, he finds a hollow tree. Inside, a raccoon hides with the missing pastries. The raccoon had plans for its own big feast!

// Pablo barks loud and clear. Manuel and the townspeople hear him and rush over. They see the raccoon and the missing treats. Everyone is surprised but relieved. They help take the pastries back to town.

// The festival goes on as planned. People enjoy the delicious goods, smiling wide. Manuel gives Pablo a special treat as thanks. The townspeople, happy and trusting again, celebrate together.

// Pablo, the clever dog, shows them all: heroes come in all shapes and sizes. Sometimes, they wag their tails, too.`;

// const dotenv = require('dotenv');
// dotenv.config();

// async function test() {
//     const openai = new OpenAI({ apiKey: process.env.OPEN_AI_APIKEY });
//     const charactersResponse = await getMainCharacterDescForEnglishStory(
//         openai,
//         englishStory
//     );

//     const characters = JSON.parse(charactersResponse);
//     console.log(characters);
//     const characterNames = Object.keys(characters.characters);

//     const scenes = await getScenesForEnglishStory(
//         openai,
//         englishStory,
//         characterNames
//     );
//     console.log(scenes);
// }

// // test();

module.exports = execute;

/* Archive */

// watercolor illustrations in a soft, blurry, and dreamy style. Faces, objects, and shapes are intentionally vague, giving a whimsical and lighthearted atmosphere.

const getScenesForEnglishStory = async (
    openai,
    englishStory,
    charactersArr
) => {
    const scenesPrompt = `Given a STORY, generate exactly **5 SCENES** that capture the essence of the story, ensuring they are visually distinct and suitable for illustration.  
Each scene must contain a **detailed, comma-separated physical description** focused entirely on visual elements.  

**Include** elements such as:
- The setting and surroundings  
- Time of day or weather, if relevant  
- Objects or key details in the environment  
- **Every main character present in the scene must be physically described** (e.g., appearance, posture, clothing, interactions).  

Avoid abstract descriptions such as smells, emotions, or sensations. Do **not** include backstory or motivations.  

Only list maincharacters in the **"characters_in_scene"** field if they are physically present in the scene and described. Focus solely on the **visual aspects** that will guide AI illustration tools.  

### STORY:
${englishStory}

### MAIN_CHARACTERS:
${charactersArr}

### JSON_FORMAT:
{
    "scenes": [
        {
            "scene_number": INTEGER,
            "physical_description": "SCENE_DESCRIPTION",
            "main_characters_in_scene": ["CHARACTER_NAME", "..."]
        },
        ...
    ]
}`;

    const response = await generate(openai, scenesPrompt, true);
    return response;
};

const getMainCharacterDescForEnglishStory = async (openai, englishStory) => {
    const scenesPrompt = `Given a STORY, generate **highly detailed PHYSICAL_DESCRIPTIONS** of the **main characters** only. 
Each description should be clear, specific, and formatted as a **comma-separated list**. Ensure the descriptions provide enough detail to create consistent visual representations across multiple uses.

Focus exclusively on **visual details**, including:
- Size, build, and stature (e.g., tall, short, muscular, slender)
- Color, texture, and pattern of skin, fur, or hair  
- Facial features (e.g., eye shape, nose size, lip fullness, jawline)  
- Hair or fur style, length, and color  
- Clothing, accessories, or distinct markings  
- Posture, stance, and gait (e.g., hunched, upright, graceful)  

**Avoid personality traits, emotions, backstory, or behavior.**  
**Limit descriptions to the main characters** and ensure each description is detailed enough to guide an AI image generator.

**Example PHYSICAL_DESCRIPTION:**  
"Pablo: large scruffy bloodhound, drooping ears nearly touching the ground, coat a mix of faded brown and tan with streaks of gray around the muzzle and paws, wrinkled forehead with loose skin around the neck, large almond-shaped brown eyes, prominent snout with black nose constantly twitching, sturdy low-built frame, muscular legs with thick joints, coarse fur along the tail, tail long and tapered with slow rhythmic wagging"

STORY:
${englishStory}

**JSON_FORMAT:**  
{
    "characters": {
        "CHARACTER_NAME": "PHYSICAL_DESCRIPTION",
        ...
    }
}`;

    const response = await generate(openai, scenesPrompt, true);
    return response;
};

const getEnglishStoryHorror = async (openai, plotOutline) => {
    const englishStoryPrompt = `Act as an expert in writing captivating short **horror** stories, tasked with crafting an exciting horror story based on a given story PLOT_OUTLINE.
This is a story to help adults learn basic English. You MUST ONLY use simple and commonly used words in the story.
The story must weave a short and simple tale that **instills suspense and fear**, engaging listeners from the beginning and holding their interest throughout.
Your writing should incorporate a plot that quickly unfolds in a compelling and thrilling manner.
Pay special attention to pacing, ensuring that the story progresses smoothly but quickly and keeps the listener eager to find out what happens next.
Make sure to show, not tell, but remember that this is for adults learning basic English.

**REQUIREMENTS:**
- ONLY use simple and common words for adults learning basic English
- Use common everday language
- Focus on creating a sense of suspense and horror
- Use present tense when possible
- Use short sentences
- Use simple dialogue

**PLOT_OUTLINE**
${plotOutline}
`;
    const response = await generate(openai, englishStoryPrompt);
    return response;
};

const getPlotOutlineHorror = async (openai, title, description) => {
    const horrorPlotPrompt = `Create a horror story PLOT OUTLINE suitable for adapting into a simple English story. Focus on building fear through simple, relatable situations.

Required Structure:

1. OPENING SCENE
Create a normal, everyday situation that will turn scary. Include:
- Main location
- Time of day
- What seems normal at first
- Small hint something is wrong

2. MAIN CHARACTER
Define ONE main character with:
- Basic job or role
- ONE key personality trait
- ONE clear fear or weakness

3. SUPPORTING CHARACTERS (Maximum 2)
For each character include:
- Connection to main character
- Why they are important to the story
- When they leave the story

4. SETTING
Describe ONE main location:
- What kind of place
- Why does it become scary

5. SCARY ELEMENTS
What are the scary elements of the story?

6. GROWING FEAR
List 3 events that get worse:
- First strange thing
- Bigger problem
- Cannot be explained

7. SCARY TRUTH
Reveal:
- What is really happening
- Why it targets this character

8. ENDING
How does the story end? It can be a twist, a resolution, or a cliffhanger.

RULES:
- Use common fears everyone understands
- Keep explanations simple
- Build fear through strange events
- End with clear but creepy finish

TITLE: ${title}
ADDITIONAL CONTEXT: ${description}

Create a scary plot outline following these elements. Use the title and context provided, but adapt them to fit a horror story format. Focus on making it scary through atmosphere and strange events.`;

    try {
        const response = await generate(openai, horrorPlotPrompt);
        console.log('Generated horror plot outline:', response);
        return response;
    } catch (error) {
        console.error('Error generating horror plot outline:', error);
        throw error;
    }
};
