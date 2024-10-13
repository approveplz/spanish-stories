const ffmpeg = require('fluent-ffmpeg');
const Case = require('case');

const { config } = require('dotenv');
config();

const fs = require('fs');
const path = require('path');

const llmGenerate = require('./openai.js');
const getAudio = require('./tts.js');

// Set the path to the FFmpeg binary
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

const INPUT_FOLDER = './audio_input';
const OUTPUT_FOLDER = './audio_output';
const TEMP_FOLDER = './temp';
const TRANSCRIPTS_FOLDER = './transcripts';
const MUSIC_FILEPATH = './music/intro.mp3';

const changeAudioSpeed = (inputPath, outputPath, speed) => {
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
};

const addSilence = (inputPath, outputPath, silenceDurationSec) => {
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
};

const concatenateFiles = (inputPaths, outputFolder, tempFolder) => {
    return new Promise((resolve, reject) => {
        const concatProcess = ffmpeg();

        // Add intro music
        concatProcess.input(MUSIC_FILEPATH);

        inputPaths.forEach((file) => {
            concatProcess.input(file);
        });

        // Also add intro music to end
        concatProcess.input(MUSIC_FILEPATH);

        const outputPath = path.join(outputFolder, `final.mp3`);

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
            .mergeToFile(outputPath, outputFolder, tempFolder);
    });
};

const extractNumberFromFilename = (filename) => {
    const match = filename.match(/_(\d+)_/); // Match the number in the format _number_
    return match ? parseInt(match[1], 10) : 0;
};

const extractLanguageFromFilename = (filename) => {
    const match = filename.match(/_(en|sp)/); // Match the language code _en or _sp
    return match ? match[1] : '';
};




const mergeAndProcessAudioFiles = async (
    inputFolder,
    outputFolder,
    tempFolder
) => {
    const files = fs
        .readdirSync(inputFolder)
        .filter((file) => file.endsWith('.mp3'))
        .sort((a, b) => {
            const numA = extractNumberFromFilename(a);
            const numB = extractNumberFromFilename(b);
            const langA = extractLanguageFromFilename(a);
            const langB = extractLanguageFromFilename(b);

            // Sort by number (ascending)
            if (numA !== numB) {
                return numA - numB;
            }

            // If numbers are the same, prioritize 'sp' before 'en'
            if (langA !== langB) {
                return langA === 'sp' ? -1 : 1; // 'sp' comes before 'en'
            }

            return 0; // If both number and language are the same, keep original order
        });

    const processedPaths = [];
    for (const file of files) {
        const inputPath = path.join(inputFolder, file);
        const outputPathSlowed = path.join(tempFolder, `slowed_${file}`);
        const language = extractLanguageFromFilename(file);
        let speed = language === 'sp' ? 0.85 : 1.0;
        await changeAudioSpeed(inputPath, outputPathSlowed, speed);
        const outputPathSlowed_Silence = path.join(
            tempFolder,
            `slowed_silence_${file}`
        );
        const processedPath = await addSilence(
            outputPathSlowed,
            outputPathSlowed_Silence,
            2
        );
        // Delete temp slowed file when handled
        fs.unlinkSync(outputPathSlowed);
        processedPaths.push(processedPath);
    }

    await concatenateFiles(processedPaths, outputFolder);
    // Delete temp processed files after concatenated
    for (const path of processedPaths) {
        fs.unlinkSync(path);
    }
};

const getAudioFiles = async (outputFolder) => {
    const storyJSON = await llmGenerate();
    const storyObj = JSON.parse(storyJSON);
    const storyTitle = storyObj['title']['english'];

    const transcriptPath = `${TRANSCRIPTS_FOLDER}/${Case.snake(
        storyTitle
    )}.json`;
    fs.writeFileSync(transcriptPath, storyJSON, 'utf8', (err) => {
        if (err) {
            console.error(`Error writing to file:`, err);
        } else {
            console.log(`File saved to ${transcriptPath}`);
        }
    });

    const storyArr = storyObj['story'];
    for (let i = 0; i < storyArr.length; i++) {
        // for (let i = 0; i < 2; i++) {
        const { english, spanish } = storyArr[i];
        const fileNameEnglish = path.join(
            outputFolder,
            `${Case.snake(storyTitle)}_audio_${i}_en.mp3`
        );
        const fileNameSpanish = path.join(
            outputFolder,
            `${Case.snake(storyTitle)}_audio_${i}_sp.mp3`
        );
        // Spanish first
        const outputPathSpanish = await getAudio(spanish, fileNameSpanish);
        const outputPathEnglish = await getAudio(english, fileNameEnglish);

        console.log({ outputPathEnglish, outputPathSpanish });
    }
};

const execute = async () => {
    await getAudioFiles(INPUT_FOLDER);
    await mergeAndProcessAudioFiles(INPUT_FOLDER, OUTPUT_FOLDER, TEMP_FOLDER);
};

execute();
