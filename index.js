const { spawn } = require('child_process');
const glob = require('glob');
// const { resolve } = require('path');
require('dotenv').config();

const Tweeter = require('./Tweeter.js');

const deleteDirContents = (dir) => {
    let rm;

    return new Promise((resolve, reject) => {
        glob(dir, (err, files) => {
            if (err) { reject(err); } 

            for (let file = 0; file < files.length; file++) {

                // Deleting file
                rm = spawn('rm', [files[file]]);
                
                // Printing process info
                rm.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                });
                rm.stderr.on('data', (data) => {
                    console.error(`stderr: ${data}`);
                });
                rm.on('close', (code) => {
                    console.log(`rm exited with code ${code}`);
                });     
            }
            resolve(`The contents of ${dir} was deleted.`);
        } );
    } );
};

const getDirContents = (dir) => {
    return new Promise((resolve, reject) => {
        glob(dir, (err, files) => {
            if (err) { reject(err); } 
            resolve(files);
        } );
    } );
};


/**
 * Runs the Twitter bot.
 */                              
let run = function() {
    const videoFile = {
        path_base: '/home/rg/Programming/javascript/twitter-interval-motion-cam/',
        path_extn: 'storage-temp/01.mp4',
        mimetype: 'video/mp4'
    };

    // Spawning motion process to record a motion-detected video
    const motion = spawn('motion', ['-c', `${videoFile.path_base}motion.conf`]);

    // Printing motion-process information
    motion.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });
    motion.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
    motion.on('close', (code) => {
        console.log(`motion exited with code ${code}`);
    });

    setTimeout(() => {

        // Killing motion process
        console.log('Killing motion');
        motion.kill();
        console.log("Waiting for the motion process to exit...");

        setTimeout(async () => {
            let videofiles;
            let videoInfo;
            let statusText;
            const oAuthData = {
                consumer_key: process.env.CONSUMER_KEY,
                consumer_secret: process.env.CONSUMER_KEY_SECRET,
                token: process.env.ACCESS_TOKEN,
                token_secret: process.env.ACCESS_TOKEN_SECRET
            };
            const tweeter = new Tweeter(oAuthData);

            try {
                videofiles = await getDirContents(`${videoFile.path_base}storage-temp/*`);
                if (videofiles.length > 0)
                {
                    videoInfo = await tweeter.prepVideo(videoFile);
                    switch (videoInfo.state) {
                        case 'succeeded':
                            statusText = 'Testing interval motion cam | '
                                        + new Date().toLocaleString('AU');
                            console.log(
                                await tweeter.tweetTextAndVideo(
                                                statusText, 
                                                videoInfo.ID
                                                )
                            );
                            break;
                        case 'failed':
                            console.log("The video failed to upload");
                            break;
                    }
                    console.log(
                        await deleteDirContents(`${videoFile.path_base}storage-temp/*`)
                    );
                }
                else {
                    statusText = 'Testing interval motion camera - '
                    + 'NO MOTION DETECTED OR VIDEO FILE NOT FOUND | ' 
                    + new Date().toLocaleString('AU');

                    try {
                        console.log( await tweeter.tweetText(statusText) );
                    }
                    catch (err) {
                        console.error(err);
                    }
                }
            }
            catch (err) {
                console.error(err);
            }

        }, 1000 * 5);
    }, 1000 * 60 * 1);
}

run();
setInterval(() => {
  run();
}, 1000 * 60 * 60);

