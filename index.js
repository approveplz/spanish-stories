const ffmpeg = require('fluent-ffmpeg');
const Case = require('case');
const videoshow = require('videoshow');
const { createCanvas, loadImage } = require('canvas');

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

const INPUT_AUDIO_FOLDER = './audio_input';
const OUTPUT_AUDIO_FOLDER = './audio_output';
const TEMP_AUDIO_FOLDER = './temp';
const TRANSCRIPTS_FOLDER = './transcripts';
const MUSIC_FILEPATH = './assets/theme_music.mp3';
const REWIND_FILEPATH = './assets/vinyl_stop_sound_effect.mp3';
const DING_FILEPATH = './assets/ding_sound_effect.mp3';
const INTRO_MUSIC_SPEECH_FILEPATH = './assets/intro_music_with_speech.mp3';
const MISC_INPUT_FOLDER = './misc_input';
const LOGO_PATH = './assets/spanish-stories-logo.jpg';

const OUTPUT_IMAGES_FOLDER = './video_input';
const OUTPUT_VIDEO_FOLDER = './video_output';

const execute = async () => {
    // // Read the stories from JSON
    // console.log('Reading stories.json');
    // const storiesPath = path.join('./assets', 'stories.json');
    // // const storiesPath = path.join('./assets', 'scary_stories.json');
    // let stories = JSON.parse(fs.readFileSync(storiesPath, 'utf8'));

    // if (stories.length === 0) {
    //     console.log('No more stories in the queue.');
    //     return;
    // }

    // const firstStory = stories[0];
    // const { title, description } = firstStory;
    // console.log(firstStory);

    // console.log('Generating story');
    // const storyObj = await llmGenerate(title, description);

    // const storyTitleEnglish = storyObj['title']['english'];
    // const storyTitleSpanish = storyObj['title']['spanish'];

    // // /* To only generate the story and save it to the transcripts folder */
    // // const storyJsonPathTest = path.join(
    // //     TRANSCRIPTS_FOLDER,
    // //     `${Case.snake(storyTitleEnglish)}.json`
    // // );
    // // fs.writeFileSync(
    // //     storyJsonPathTest,
    // //     JSON.stringify(storyObj, null, 2),
    // //     'utf8'
    // // );
    // // return;
    // // /* */

    // console.log('Generating audio files');
    // const { hookFilePath, outputFolder } = await getAudioFiles(
    //     INPUT_AUDIO_FOLDER,
    //     MISC_INPUT_FOLDER,
    //     storyObj
    // );

    // // Generate and save transcript metadata
    // const hook = storyObj['hook'];
    // const podcastTitle = `[A2-B1] ${Case.title(
    //     storyTitleEnglish
    // )} - ${Case.title(storyTitleSpanish)}`;
    // const episodeDescription = getEpisodeDescription(
    //     hook,
    //     Case.title(storyTitleSpanish)
    // );

    // storyObj.podcastTitle = podcastTitle;
    // storyObj.episodeDescription = episodeDescription;

    // console.log('Saving story to transcripts folder');
    // const storyJsonPath = path.join(
    //     TRANSCRIPTS_FOLDER,
    //     `${Case.snake(storyTitleEnglish)}.json`
    // );
    // fs.writeFileSync(storyJsonPath, JSON.stringify(storyObj, null, 2), 'utf8');

    // testing
    const hookFilePath =
        '/Users/alanzhang/dev/spanish-stories/misc_input/the_whales_song_hook_en.mp3';

    const outputFolder = OUTPUT_AUDIO_FOLDER;
    const storyTitleEnglish = 'The Whales Song';

    // Create the final files
    console.log('Merging and processing audio files');
    const finalPodcastPath = await mergeAndProcessAudioFiles(
        INPUT_AUDIO_FOLDER,
        outputFolder,
        TEMP_AUDIO_FOLDER,
        storyTitleEnglish,
        hookFilePath
    );

    const finalVideoPath = await generateVideo(
        storyObj,
        TEMP_AUDIO_FOLDER,
        OUTPUT_IMAGES_FOLDER,
        OUTPUT_VIDEO_FOLDER
    );

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

    // await moveFilesToArchiveFolder(storyTitleEnglish);
};

execute();

// const storyObj = JSON.parse(
//     fs.readFileSync('./transcripts/the_whales_song.json', 'utf8')
// );

async function generateVideo(
    storyObj,
    tempFolder,
    outputImagesFolder,
    outputVideoFolder
) {
    const videoPathIntro = await getVideoFromIntroMusic(
        storyObj,
        outputImagesFolder,
        outputVideoFolder
    );

    const videoPathHook = await getVideoFromHook(
        storyObj,
        tempFolder,
        outputImagesFolder,
        outputVideoFolder,
        DING_FILEPATH
    );

    const { videoPath_sp, videoPath_en_sp } = await getVideoFromStoryAudio(
        storyObj,
        tempFolder,
        outputImagesFolder,
        outputVideoFolder,
        REWIND_FILEPATH,
        MUSIC_FILEPATH
    );

    // Merge videos
    const storyTitleEnglish = storyObj['title']['english'];
    const finalVideoPath = await mergeFiles(
        [videoPathIntro, videoPathHook, videoPath_sp, videoPath_en_sp],
        // [videoPath_sp, videoPath_en_sp],
        path.join(
            outputVideoFolder,
            `video_${Case.snake(storyTitleEnglish)}_final.mp4`
        )
    );

    return finalVideoPath;
}

async function getVideoFromStoryAudio(
    storyObj,
    tempFolder,
    outputImagesFolder,
    outputVideoFolder,
    betweenStoryAudioFilePath,
    afterStoryAudioFilePath
) {
    console.log('Starting story audio video generation...');
    const storyArr = storyObj['story'];
    const storyTitleEnglish = storyObj['title']['english'];

    console.log('Generating images for story audio in English and Spanish...');
    const imagePaths_en_sp = (
        await Promise.all(
            storyArr.map(
                async ({ english: englishText, spanish: spanishText }, i) => {
                    const spanishPath = await createImageWithDynamicText(
                        spanishText,
                        i,
                        outputImagesFolder,
                        'sp'
                    );
                    const englishPath = await createImageWithDynamicText(
                        englishText,
                        i,
                        outputImagesFolder,
                        'en'
                    );
                    return [spanishPath, englishPath];
                }
            )
        )
    ).flat();
    console.log(`Generated ${imagePaths_en_sp.length} images successfully`);

    console.log('Finding story audio files...');
    const files_en_sp = fs
        .readdirSync(tempFolder)
        .filter(
            (file) =>
                file.endsWith('.mp3') &&
                file.includes('silence_slowed') &&
                file.includes('audio')
        );

    console.log(`Found ${files_en_sp.length} audio files`);

    const storyAudioDurations_en_sp = {};
    console.log('Calculating audio durations...');
    for (const file of files_en_sp) {
        const language = extractLanguageFromFilename(file);
        const index = extractNumberFromFilename(file);
        const filePath = path.join(tempFolder, file);
        const duration = await getAudioDuration(filePath);

        if (!storyAudioDurations_en_sp[index]) {
            storyAudioDurations_en_sp[index] = {};
        }
        storyAudioDurations_en_sp[index][language] = duration;
    }
    console.log('Audio durations calculated successfully');

    // Generate Spanish video

    const audioFileName_sp = 'slow_silence_merged_sp.mp3';
    const audioPath_sp = path.join(tempFolder, audioFileName_sp);

    const imagePaths_sp = imagePaths_en_sp.filter(
        (filePath) =>
            extractLanguageFromFilename(path.basename(filePath)) === 'sp'
    );

    console.log(`Creating Spanish video...`);
    const videoPath_sp = await createVideoFromImagesAndAudio_StoryAudio(
        imagePaths_sp,
        audioPath_sp,
        storyAudioDurations_en_sp,
        outputVideoFolder,
        `video_${Case.snake(storyTitleEnglish)}_sp.mp4`,
        betweenStoryAudioFilePath
    );
    console.log('Spanish video created:', videoPath_sp);

    // Generate English-Spanish video
    console.log('Creating English-Spanish video...');
    const audioFileName_en_sp = 'slow_silence_merged_en_sp.mp3';
    const audioPath_en_sp = path.join(tempFolder, audioFileName_en_sp);

    console.log(`Using ${imagePaths_en_sp.length} total images`);
    const videoPath_en_sp = await createVideoFromImagesAndAudio_StoryAudio(
        imagePaths_en_sp,
        audioPath_en_sp,
        storyAudioDurations_en_sp,
        outputVideoFolder,
        `video_${Case.snake(storyTitleEnglish)}_en_sp.mp4`,
        afterStoryAudioFilePath
    );
    console.log('English-Spanish video created:', videoPath_en_sp);

    return { videoPath_sp, videoPath_en_sp };
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

    return { hookFilePath, outputFolder: OUTPUT_AUDIO_FOLDER };
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
    await addSilenceAndRoundTotalAudioTime(
        hookFilePath,
        hookPath_silence,
        1.75
    );

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

    // Clean up Spanish files with short silence
    // Leave these in the temp folder to test video generation
    // spanishFilesWithSilence.forEach((file) => fs.unlinkSync(file));

    const slowSilencePaths_en_sp = await Promise.all(
        slowedPaths_en_sp.map(async (file) => {
            const outputPathWithSilence = path.join(
                tempFolder,
                `silence_${path.basename(file)}`
            );
            const language = extractLanguageFromFilename(path.basename(file));
            const silenceDuration = language === 'sp' ? 1 : 1.75;

            await addSilenceAndRoundTotalAudioTime(
                file,
                outputPathWithSilence,
                silenceDuration
            );
            return outputPathWithSilence;
        })
    );

    const slowSilencePaths_sp = slowSilencePaths_en_sp.filter(
        (file) => extractLanguageFromFilename(path.basename(file)) === 'sp'
    );

    const slowSilenceMergedPath_sp = path.join(
        tempFolder,
        'slow_silence_merged_sp.mp3'
    );
    await mergeFiles(slowSilencePaths_sp, slowSilenceMergedPath_sp);

    // Clean up slowed files
    // slowedPaths_en_sp.forEach((file) => fs.unlinkSync(file));

    const slowSilenceMergedPath_en_sp = path.join(
        tempFolder,
        `slow_silence_merged_en_sp.mp3`
    );
    await mergeFiles(slowSilencePaths_en_sp, slowSilenceMergedPath_en_sp);

    // Clean up files with silence
    // slowSilencePaths_en_sp.forEach((file) => fs.unlinkSync(file));

    const finalOutputPath = path.join(
        outputFolder,
        `${Case.snake(storyTitle)}_final_output.mp3`
    );

    const audioFilesToMerge = [
        INTRO_MUSIC_SPEECH_FILEPATH,
        hookPath_silence,
        DING_FILEPATH,
        slowSilenceMergedPath_sp,
        REWIND_FILEPATH,
        slowSilenceMergedPath_en_sp,
        MUSIC_FILEPATH,
    ];

    await mergeFiles(audioFilesToMerge, finalOutputPath);

    // Clean up final temporary files
    // fs.unlinkSync(hookPath_silence);
    // fs.unlinkSync(spanishSlowMergedShortSilencePath);
    // fs.unlinkSync(slowSilenceMergedPath_en_sp);

    return finalOutputPath;
}

async function moveFilesToArchiveFolder(storyTitle) {
    console.log('Moving files to archive folder');

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
    moveFiles(INPUT_AUDIO_FOLDER);
    moveFiles(MISC_INPUT_FOLDER);
    moveFiles(TRANSCRIPTS_FOLDER);

    console.log(`All files moved to ${archiveFolderPath}`);
}

// Video generation helper functions

async function createImageWithDynamicText(
    text,
    frameNumber,
    outputFolder,
    type, // 'en' or 'sp' for story audio. 'hook' for hook, etc
    backgroundImagePath = null // Make backgroundImagePath optional
) {
    const width = 1920;
    const height = 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (backgroundImagePath) {
        // Load and draw the background image if provided
        const backgroundImage = await loadImage(backgroundImagePath);
        ctx.drawImage(backgroundImage, 0, 0, width, height);
    } else {
        // Use yellow background if no image path is provided
        ctx.fillStyle = 'yellow';
        ctx.fillRect(0, 0, width, height);
    }

    // Set a fixed font size
    const fontSize = 80;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = 'white'; // Changed to white for better visibility on images
    ctx.strokeStyle = 'black'; // Add an outline to make text more readable
    ctx.lineWidth = 4; // Increase the line width for a thicker outline
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const wrapText = (
        context,
        text,
        centerX,
        centerY,
        maxWidth,
        lineHeight
    ) => {
        const words = text.split(' ');
        let currentLine = '';
        const wrappedLines = [];

        words.forEach((word) => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const { width: testWidth } = context.measureText(testLine);

            if (testWidth > maxWidth && currentLine) {
                wrappedLines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine) {
            wrappedLines.push(currentLine);
        }

        const totalTextHeight = wrappedLines.length * lineHeight;
        const startY = centerY - totalTextHeight / 2;

        wrappedLines.forEach((line, index) => {
            const lineY = startY + index * lineHeight;
            context.strokeText(line, centerX, lineY);
            context.fillText(line, centerX, lineY);
        });
    };

    const lineHeight = fontSize * 1.2;
    wrapText(ctx, text, width / 2, height / 2, width * 0.8, lineHeight);

    const filePath = path.join(
        outputFolder,
        `frame_${type}_${frameNumber}.png`
    );
    fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
    return filePath;
}

async function createVideoFromImagesAndAudio_StoryAudio(
    imagePaths,
    audioPath,
    storyAudioDurationsObj,
    outputFolder,
    outputFileName,
    outroAudioPath = null
) {
    console.log(`Creating video from images and audio for ${outputFileName}`);
    const outputPath = path.join(outputFolder, outputFileName);

    // Create image objects for videoshow
    const videoshowImageObjs = imagePaths.map((imagePath) => {
        const fileName = path.basename(imagePath);
        const index = extractNumberFromFilename(fileName);
        const language = extractLanguageFromFilename(fileName);

        if (
            !storyAudioDurationsObj[index] ||
            !storyAudioDurationsObj[index][language]
        ) {
            throw new Error(
                `Missing duration for index ${index}, language ${language}`
            );
        }

        return {
            path: imagePath,
            loop: storyAudioDurationsObj[index][language],
        };
    });

    let finalAudioPath = audioPath;

    if (outroAudioPath) {
        console.log('Outro audio file found:', outroAudioPath);
        finalAudioPath = await mergeFiles(
            [audioPath, outroAudioPath],
            appendToFileName(audioPath, '_final')
        );
        videoshowImageObjs[videoshowImageObjs.length - 1].loop +=
            await getAudioDuration(outroAudioPath);
        console.log('Audio merged with outro audio');
    }

    const videoOptions = {
        fps: 30,
        transition: false,
        videoBitrate: 1024,
        videoCodec: 'libx264',
        size: '1920x1080',
        outputOptions: ['-preset ultrafast', '-pix_fmt yuv420p'],
        format: 'mp4',
    };

    console.log('Starting video generation...');
    console.log('Images:', imagePaths);
    console.log('Audio file:', finalAudioPath);
    console.log('Output:', outputPath);

    return new Promise((resolve, reject) => {
        videoshow(videoshowImageObjs, videoOptions)
            .audio(finalAudioPath, { fade: false })
            .save(outputPath)
            .on('start', (command) => {
                // console.log('FFmpeg process started:', command);
                console.log('FFmpeg process started');
            })
            .on('error', (err, stdout, stderr) => {
                console.error('Error:', err);
                console.error('ffmpeg stderr:', stderr);
                reject(err);
            })
            .on('end', (output) => {
                console.log('Video created successfully:', output);
                resolve(outputPath);
            });
    });
}

async function createVideoFromImagesAndAudio_OtherAudio(
    imagePaths,
    audioPath,
    durationsArr,
    outputFolder,
    outputFileName,
    outroAudioPath = null
) {
    console.log(`Creating video from images and audio for ${audioPath}`);

    const outputPath = path.join(outputFolder, outputFileName);

    // Create image objects for videoshow
    const videoshowImageObjs = imagePaths.map((imagePath, index) => {
        if (!durationsArr[index]) {
            throw new Error(`Missing duration for index ${index}`);
        }

        return {
            path: imagePath,
            loop: durationsArr[index],
        };
    });

    let finalAudioPath = audioPath;

    if (outroAudioPath) {
        console.log('Outro audio file found:', outroAudioPath);
        finalAudioPath = await mergeFiles(
            [audioPath, outroAudioPath],
            appendToFileName(audioPath, '_final')
        );
        videoshowImageObjs[videoshowImageObjs.length - 1].loop +=
            await getAudioDuration(outroAudioPath);
        console.log('Audio merged with outro audio');
    }

    const videoOptions = {
        fps: 30,
        transition: false,
        videoBitrate: 1024,
        videoCodec: 'libx264',
        size: '1920x1080',
        outputOptions: ['-preset ultrafast', '-pix_fmt yuv420p'],
        format: 'mp4',
    };

    console.log('Images:', imagePaths);
    console.log('Audio file:', finalAudioPath);
    console.log('Output:', outputPath);

    return new Promise((resolve, reject) => {
        videoshow(videoshowImageObjs, videoOptions)
            .audio(finalAudioPath, { fade: false })
            .save(outputPath)
            .on('start', (command) => {
                // console.log('FFmpeg process started:', command);
                console.log('FFmpeg process started');
            })
            .on('error', (err, stdout, stderr) => {
                console.error('Error:', err);
                console.error('ffmpeg stdout:', stdout);
                console.error('ffmpeg stderr:', stderr);
                reject(err);
            })
            .on('end', (output) => {
                console.log('Video created successfully:', output);
                resolve(outputPath);
            });
    });
}

async function getVideoFromHook(
    storyObj,
    tempFolder,
    outputImagesFolder,
    outputVideoFolder,
    outroAudioPath = null
) {
    console.log('Starting hook video generation...');
    const hookText = storyObj.hook;
    const storyTitleEnglish = storyObj['title']['english'];

    console.log('Creating hook image...');
    const hookImagePath = await createImageWithDynamicText(
        hookText,
        0,
        outputImagesFolder,
        'hook'
    );
    console.log('Hook image created:', hookImagePath);

    console.log('Finding hook audio file...');
    const hookAudioFiles = fs
        .readdirSync(tempFolder)
        .filter((file) => file.endsWith('.mp3') && file.includes('hook'));

    if (!hookAudioFiles.length || hookAudioFiles.length !== 1) {
        throw new Error(
            `Expected one hook audio file. Found: ${hookAudioFiles.length}`
        );
    }
    let hookAudioPath = path.join(tempFolder, hookAudioFiles[0]);
    console.log('Hook audio file found:', hookAudioPath);

    let hookDuration = await getAudioDuration(hookAudioPath);

    console.log('Creating hook video...');
    const videoPathHook = await createVideoFromImagesAndAudio_OtherAudio(
        [hookImagePath],
        hookAudioPath,
        [hookDuration],
        outputVideoFolder,
        `video_${Case.snake(storyTitleEnglish)}_hook.mp4`,
        outroAudioPath
    );
    console.log('Hook video created:', videoPathHook);

    return videoPathHook;
}

async function getVideoFromIntroMusic(
    storyObj,
    outputImagesFolder,
    outputVideoFolder
) {
    console.log('Starting intro video generation...');
    const storyTitleEnglish = storyObj['title']['english'];

    const introText = `Hola y bienvenidos a Spanish Stories. I'm your host, María, and in this podcast, we help you learn Spanish by reading short, engaging stories. First, we read the story entirely in Spanish, and then we go through it again, translating line by line to English.`;

    console.log('Creating intro image...');
    const introImagePath = await createImageWithDynamicText(
        introText,
        0,
        outputImagesFolder,
        'intro'
    );
    console.log('Intro image created:', introImagePath);

    const introAudioPath = INTRO_MUSIC_SPEECH_FILEPATH;

    const introDuration = [await getAudioDuration(introAudioPath)];

    console.log('Creating intro video...');
    const videoPathIntro = await createVideoFromImagesAndAudio_OtherAudio(
        [introImagePath],
        introAudioPath,
        [introDuration],
        outputVideoFolder,
        `video_${Case.snake(storyTitleEnglish)}_intro.mp4`
    );
    console.log('Intro video created:', videoPathIntro);

    return videoPathIntro;
}

function getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(audioPath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration);
        });
    });
}

// Helper functions
// function mergeFiles(inputPaths, outputPath) {
//     return new Promise((resolve, reject) => {
//         const concatProcess = ffmpeg();

//         if (!Array.isArray(inputPaths) || inputPaths.length === 0) {
//             return reject(new Error('Invalid or empty input paths array'));
//         }

//         inputPaths.forEach((file) => {
//             if (typeof file !== 'string' || file.trim() === '') {
//                 return reject(new Error(`Invalid input path: ${file}`));
//             }
//             concatProcess.input(file);
//         });

//         concatProcess
//             .on('end', () => {
//                 console.log(
//                     `Concatenation completed successfully. Output path: ${outputPath}`
//                 );
//                 resolve(outputPath);
//             })
//             .on('error', (err) => {
//                 console.error(
//                     'An error occurred during concatenation:',
//                     err.message
//                 );
//                 reject(err);
//             })
//             .mergeToFile(outputPath, path.dirname(outputPath));
//     });
// }

async function mergeFiles(inputPaths, outputPath) {
    if (!Array.isArray(inputPaths) || inputPaths.length === 0) {
        throw new Error('Invalid or empty input paths array');
    }

    // Create a temporary concat file with absolute paths
    const tempListPath = path.join(path.dirname(outputPath), 'concat.txt');
    let fileListContent = '';

    // Create concat file with absolute paths
    for (const file of inputPaths) {
        const absolutePath = path.resolve(file);
        fileListContent += `file '${absolutePath}'\n`;
    }

    fs.writeFileSync(tempListPath, fileListContent);

    try {
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(tempListPath)
                .inputOptions(['-f', 'concat', '-safe', '0'])
                .outputOptions(['-c', 'copy'])
                .on('start', (command) => {})
                .on('end', resolve)
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .save(outputPath);
        });

        return outputPath;
    } finally {
        // Clean up temp file in all cases
        if (fs.existsSync(tempListPath)) {
            fs.unlinkSync(tempListPath);
        }
    }
}

function changeAudioSpeed(inputPath, outputPath, speed) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioFilters(`atempo=${speed}`)
            .output(outputPath)
            .on('end', () => {
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('An error occurred:', err.message);
                reject(err);
            })
            .run();
    });
}

function addSilenceAndRoundTotalAudioTime(
    inputPath,
    outputPath,
    silenceDurationSec
) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) return reject(err);
            const originalDuration = metadata.format.duration;
            const totalDuration = originalDuration + silenceDurationSec;
            // Round up to nearest second
            const roundedDuration = Math.ceil(totalDuration);
            const adjustedPadding = roundedDuration - originalDuration;

            ffmpeg(inputPath)
                .audioFilters(`apad=pad_dur=${adjustedPadding}`)
                .on('end', () => {
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('An error occurred:', err.message);
                    reject(err);
                })
                .save(outputPath);
        });
    });
}

function extractNumberFromFilename(filename) {
    // Remove the file extension before searching for numbers
    const nameWithoutExt = filename.split('.')[0];
    const matches = nameWithoutExt.match(/\d+/g);

    if (!matches) {
        throw new Error(`No number found in filename: ${filename}`);
    }

    if (matches.length > 1) {
        throw new Error(
            `Multiple numbers found in filename: ${filename}. Matches: ${matches}. Expected only one number.`
        );
    }

    return parseInt(matches[0], 10);
}

function extractLanguageFromFilename(filename) {
    const match = filename.match(/_(en|sp)/); // Match the language code _en or _sp
    if (!match) {
        throw new Error(
            `No language code (en/sp) found in filename: ${filename}`
        );
    }
    return match[1];
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
    const description = `${hook} Perfect for language learners, this episode is presented in both Spanish and English, helping you immerse yourself in the beauty of the story while improving your language skills. Whether you’re just starting out or looking to refine your fluency, listen along as we read the story in both languages. Grab your headphones and let the magic of ${spanishTitle} inspire your bilingual adventure! Spanish Level: A2 - B1`;

    return description;
}

function appendToFileName(filePath, suffix) {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    return path.join(dir, `${baseName}${suffix}${ext}`);
}
