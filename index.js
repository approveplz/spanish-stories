const ffmpeg = require('fluent-ffmpeg');
const Case = require('case');

const { config } = require('dotenv');
config();

const fs = require('fs');
const path = require('path');

const llmGenerate = require('./openai.js');
const getAudio = require('./tts.js');
// const uploadPodcast = require('./uploadPodcast.js');

// Set the path to the FFmpeg binary
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

const INPUT_FOLDER = './audio_input';
const OUTPUT_FOLDER = './audio_output';
const TEMP_FOLDER = './temp';
const TRANSCRIPTS_FOLDER = './transcripts';
const MUSIC_FILEPATH = './assets/theme_music.mp3';
const REWIND_FILEPATH = './assets/vinyl_stop_sound_effect.mp3';
const DING_FILEPATH = './assets/ding_sound_effect.mp3';
const INTRO_MUSIC_SPEECH_FILEPATH = './assets/intro_music_with_speech.mp3';
const MISC_INPUT_FOLDER = './misc_input';
const LOGO_PATH = './assets/spanish-stories-logo.jpg';

/*
Video generation
*/

const {
    createImageWithDynamicText,
    createVideoFromImagesAndAudio,
} = require('./generateVideo');

const OUTPUT_IMAGES_FOLDER = './video_input';
const OUTPUT_VIDEO_FOLDER = './video_output';

const execute = async () => {
    // Read the stories from JSON
    console.log('Reading stories.json');
    const storiesPath = path.join('./assets', 'stories.json');
    // const storiesPath = path.join('./assets', 'scary_stories.json');
    let stories = JSON.parse(fs.readFileSync(storiesPath, 'utf8'));

    if (stories.length === 0) {
        console.log('No more stories in the queue.');
        return;
    }

    const firstStory = stories[0];
    const { title, description } = firstStory;
    console.log(firstStory);

    console.log('Generating story');
    const storyObj = await llmGenerate(title, description);

    const storyTitleEnglish = storyObj['title']['english'];
    const storyTitleSpanish = storyObj['title']['spanish'];

    // /* To only generate the story and save it to the transcripts folder */
    // const storyJsonPathTest = path.join(
    //     TRANSCRIPTS_FOLDER,
    //     `${Case.snake(storyTitleEnglish)}.json`
    // );
    // fs.writeFileSync(
    //     storyJsonPathTest,
    //     JSON.stringify(storyObj, null, 2),
    //     'utf8'
    // );
    // return;
    // /* */

    console.log('Generating audio files');
    const { hookFilePath, outputFolder } = await getAudioFiles(
        INPUT_FOLDER,
        MISC_INPUT_FOLDER,
        storyObj
    );

    console.log('Merging and processing audio files');
    const finalPodcastPath = await mergeAndProcessAudioFiles(
        INPUT_FOLDER,
        outputFolder,
        TEMP_FOLDER,
        storyTitleEnglish,
        hookFilePath
    );

    const hook = storyObj['hook'];

    const podcastTitle = `[A1-A2] ${Case.title(
        storyTitleEnglish
    )} - ${Case.title(storyTitleSpanish)}`;
    const episodeDescription = getEpisodeDescription(
        hook,
        Case.title(storyTitleSpanish)
    );

    storyObj.podcastTitle = podcastTitle;
    storyObj.episodeDescription = episodeDescription;

    console.log('Saving story to transcripts folder');
    const storyJsonPath = path.join(
        TRANSCRIPTS_FOLDER,
        `${Case.snake(storyTitleEnglish)}.json`
    );
    fs.writeFileSync(storyJsonPath, JSON.stringify(storyObj, null, 2), 'utf8');

    /* 
    This uploads to Podbean. Using Spotify hosting for now.
    */
    // await uploadPodcast(
    //     podcastTitle,
    //     finalPodcastPath,
    //     LOGO_PATH,
    //     episodeDescription
    // );

    // Update stories.json
    console.log('Updating stories JSON');
    stories.shift();
    fs.writeFileSync(storiesPath, JSON.stringify(stories, null, 2), 'utf8');

    console.log('Moving files to archive folder');
    await moveFilesToArchiveFolder(storyTitleEnglish);
};

execute();

const storyObj = JSON.parse(
    fs.readFileSync('./transcripts/a_silent_melody.json', 'utf8')
);

// generateVideo(storyObj, TEMP_FOLDER, OUTPUT_IMAGES_FOLDER, OUTPUT_VIDEO_FOLDER);

async function generateVideo(
    storyObj,
    tempFolder,
    outputImagesFolder,
    outputVideoFolder
) {
    const storyArr = storyObj['story'];

    const imagePaths = await Promise.all(
        storyArr.map(async ({ spanish }, i) => {
            console.log({ i, spanish });
            return await createImageWithDynamicText(
                spanish,
                i,
                outputImagesFolder
            );
        })
    );

    // need to filter to just get short silence slowed or something
    const files = fs
        .readdirSync(tempFolder)
        .sort(sortFilesAsc)
        .filter((file) => file.endsWith('.mp3'));

    const spanishFiles = files.filter(
        (file) => extractLanguageFromFilename(file) === 'sp'
    );

    const spanishDurations = await Promise.all(
        spanishFiles.map(async (file) => {
            const duration = await getAudioDuration(
                path.join(tempFolder, file)
            );
            console.log({ file, duration });
            return duration;
        })
    );

    const audioPath = path.join(
        tempFolder,
        'spanish_slow_merged_short_silence.mp3'
    );

    console.log(spanishDurations);

    await createVideoFromImagesAndAudio(
        imagePaths,
        audioPath,
        spanishDurations,
        outputVideoFolder
    );
}

// Main processing functions
async function getAudioFiles(storyOutputFolder, miscOutputFolder, storyObj) {
    const storyTitle = storyObj['title']['english'];
    const hookFilePath = path.join(
        miscOutputFolder,
        `${Case.snake(storyTitle)}_hook_en.mp3`
    );
    await getAudio(storyObj['hook'], hookFilePath);

    const storyArr = storyObj['story'];
    for (let i = 0; i < storyArr.length; i++) {
        const { english, spanish } = storyArr[i];
        const fileNameEnglish = path.join(
            storyOutputFolder,
            `${Case.snake(storyTitle)}_audio_${i}_en.mp3`
        );
        const fileNameSpanish = path.join(
            storyOutputFolder,
            `${Case.snake(storyTitle)}_audio_${i}_sp.mp3`
        );
        // Spanish first
        await getAudio(spanish, fileNameSpanish);
        await getAudio(english, fileNameEnglish);
    }

    return { hookFilePath, outputFolder: OUTPUT_FOLDER };
}

async function mergeAndProcessAudioFiles(
    inputFolder,
    outputFolder,
    tempFolder,
    storyTitle,
    hookFilePath
) {
    const hookPath_silence = path.join(
        tempFolder,
        `silence_${path.basename(hookFilePath)}`
    );
    await addSilence(hookFilePath, hookPath_silence, 1.75);

    // Add silence to the hook file
    await addSilence(hookFilePath, hookPath_silence, 1.75); // Add 1.75 seconds of silence
    console.log(`Silence added to hook file: ${hookPath_silence}`);

    const files = fs
        .readdirSync(inputFolder)
        .filter((file) => file.endsWith('.mp3'))
        .sort(sortFilesAsc);

    // Process all files (change speed)
    const slowedPaths_en_sp = await Promise.all(
        files.map(async (file) => {
            const inputPath = path.join(inputFolder, file);
            const outputPathSlowed = path.join(tempFolder, `slowed_${file}`);
            const language = extractLanguageFromFilename(file);
            const speed = language === 'sp' ? 0.85 : 1.0;
            await changeAudioSpeed(inputPath, outputPathSlowed, speed);
            return outputPathSlowed;
        })
    );

    // Add silence to Spanish files
    const spanishFilesWithSilence = await Promise.all(
        slowedPaths_en_sp
            .filter(
                (file) =>
                    extractLanguageFromFilename(path.basename(file)) === 'sp'
            )
            .map(async (file) => {
                const outputPathWithSilence = path.join(
                    tempFolder,
                    `short_silence_${path.basename(file)}`
                );
                await addSilence(file, outputPathWithSilence, 1);
                return outputPathWithSilence;
            })
    );

    const spanishSlowMergedShortSilencePath = path.join(
        tempFolder,
        'spanish_slow_merged_short_silence.mp3'
    );
    await mergeFiles(
        spanishFilesWithSilence,
        spanishSlowMergedShortSilencePath
    );

    // Clean up Spanish files with short silence
    // Leave these in the temp folder to test video generation
    // spanishFilesWithSilence.forEach((file) => fs.unlinkSync(file));

    const slowSilencePaths_en_sp = await Promise.all(
        slowedPaths_en_sp.map(async (file) => {
            const outputPathWithSilence = path.join(
                tempFolder,
                `silence_${path.basename(file)}`
            );
            await addSilence(file, outputPathWithSilence, 1.75);
            return outputPathWithSilence;
        })
    );

    // Clean up slowed files
    slowedPaths_en_sp.forEach((file) => fs.unlinkSync(file));

    const slowSilenceMergedPath_en_sp = path.join(
        tempFolder,
        `slow_silence_merged_en_sp.mp3`
    );
    await mergeFiles(slowSilencePaths_en_sp, slowSilenceMergedPath_en_sp);

    // Clean up files with silence
    slowSilencePaths_en_sp.forEach((file) => fs.unlinkSync(file));

    const finalOutputPath = path.join(
        outputFolder,
        `${Case.snake(storyTitle)}_final_output.mp3`
    );

    await mergeFiles(
        [
            INTRO_MUSIC_SPEECH_FILEPATH,
            hookPath_silence,
            DING_FILEPATH,
            spanishSlowMergedShortSilencePath,
            REWIND_FILEPATH,
            slowSilenceMergedPath_en_sp,
            MUSIC_FILEPATH,
        ],
        finalOutputPath
    );

    // Clean up final temporary files
    // fs.unlinkSync(hookPath_silence);
    // fs.unlinkSync(spanishSlowMergedShortSilencePath);
    // fs.unlinkSync(slowSilenceMergedPath_en_sp);

    return finalOutputPath;
}

async function moveFilesToArchiveFolder(storyTitle) {
    const storyFolderName = Case.snake(storyTitle);
    const archiveFolderPath = path.join('./archive', storyFolderName);

    // Create the archive folder if it doesn't exist
    if (!fs.existsSync(archiveFolderPath)) {
        fs.mkdirSync(archiveFolderPath, { recursive: true });
    }

    // Function to move files from a source folder to the archive folder
    const moveFiles = (sourceFolder) => {
        const files = fs.readdirSync(sourceFolder);
        files.forEach((file) => {
            const sourcePath = path.join(sourceFolder, file);
            const destPath = path.join(archiveFolderPath, file);
            fs.renameSync(sourcePath, destPath);
            console.log(`Moved ${file} to ${archiveFolderPath}`);
        });
    };

    // Move files from audio_input and misc_input
    moveFiles(INPUT_FOLDER);
    moveFiles(MISC_INPUT_FOLDER);
    moveFiles(TRANSCRIPTS_FOLDER);

    console.log(`All files moved to ${archiveFolderPath}`);
}

// Helper functions
function mergeFiles(inputPaths, outputPath) {
    return new Promise((resolve, reject) => {
        const concatProcess = ffmpeg();

        if (!Array.isArray(inputPaths) || inputPaths.length === 0) {
            return reject(new Error('Invalid or empty input paths array'));
        }

        inputPaths.forEach((file) => {
            if (typeof file !== 'string' || file.trim() === '') {
                return reject(new Error(`Invalid input path: ${file}`));
            }
            concatProcess.input(file);
        });

        concatProcess
            .on('end', () => {
                console.log(
                    `Concatenation completed successfully. Output path: ${outputPath}`
                );
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error(
                    'An error occurred during concatenation:',
                    err.message
                );
                reject(err);
            })
            .mergeToFile(outputPath, path.dirname(outputPath));
    });
}

function changeAudioSpeed(inputPath, outputPath, speed) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioFilters(`atempo=${speed}`)
            .output(outputPath)
            .on('end', () => {
                console.log(
                    `Audio file successfully slowed. File: ${inputPath}. Output: ${outputPath}. Speed: ${speed}`
                );
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('An error occurred:', err.message);
                reject(err);
            })
            .run();
    });
}

function addSilence(inputPath, outputPath, silenceDurationSec) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioFilters(`apad=pad_dur=${silenceDurationSec}`)
            .on('end', () => {
                console.log(
                    `Silence successfully added to the end of the audio file. File: ${inputPath}. Output: ${outputPath}. Silence: ${silenceDurationSec}s`
                );
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('An error occurred:', err.message);
                reject(err);
            })
            .save(outputPath);
    });
}

function extractNumberFromFilename(filename) {
    const match = filename.match(/_(\d+)_/); // Match the number in the format _number_
    return match ? parseInt(match[1], 10) : 0;
}

function extractLanguageFromFilename(filename) {
    const match = filename.match(/_(en|sp)/); // Match the language code _en or _sp
    return match ? match[1] : '';
}

function sortFilesAsc(fileA, fileB) {
    const numA = extractNumberFromFilename(fileA);
    const numB = extractNumberFromFilename(fileB);
    const langA = extractLanguageFromFilename(fileA);
    const langB = extractLanguageFromFilename(fileB);

    // Sort by number (ascending)
    if (numA !== numB) {
        return numA - numB;
    }

    // If numbers are the same, prioritize 'sp' before 'en'
    if (langA !== langB) {
        return langA === 'sp' ? -1 : 1; // 'sp' comes before 'en'
    }

    return 0; // If both number and language are the same, keep original order
}

function getEpisodeDescription(hook, spanishTitle) {
    const description = `${hook} Perfect for language learners, this episode is presented in both Spanish and English, helping you immerse yourself in the beauty of the story while improving your language skills. Whether you’re just starting out or looking to refine your fluency, listen along as we read the story in both languages. Grab your headphones and let the magic of ${spanishTitle} inspire your bilingual adventure! Spanish Level: A1 - A2`;

    return description;
}

function getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(audioPath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration);
        });
    });
}
