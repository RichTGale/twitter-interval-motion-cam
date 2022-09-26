const { spawn } = require('child_process');
const fs = require('fs-extra');
const request = require('request');
const glob = require('glob');
const splitFile = require('split-file');
//require('dotenv').config();

/**
 * Tweets text to Twitter.
 */
const tweetText= function(text, oAuthData) {
    return new Promise((resolve, reject) => {
        const formData = {
            status: text
        };

        request.post( 
            { 
                url: 'https://api.twitter.com/1.1/statuses/update.json', 
                oauth: oAuthData,
                form: formData, 
                json: true 
            }, 
            (err, response, body) => {
                if (err) { reject(err); }
                else { resolve(body); }
            } 
        );
    } );
};

/**
 * Initialises a media ID for chunk-uploading.
 */
const initMediaUpload = (file, oAuthData, fileSize) => {
    return new Promise((resolve, reject) => {
        const formData = {
            command: 'INIT',
            total_bytes: fileSize,
            media_type: file.mimetype,
            media_category: 'tweet_video'
        };

        request.post( 
            { 
                url: 'https://upload.twitter.com/1.1/media/upload.json', 
                oauth: oAuthData,
                form: formData, 
                json: true 
            }, 
            (err, response, body) => {
                if (err) { reject(err); }
                else { resolve(body); }
            }    
        );
    } );
}


const chunkMediaUpload = (mediaId, media, index, oAuthData) => {
    return new Promise((resolve, reject) => {
        const formData = {
            command: 'APPEND',
            media_id: mediaId,
            media: media, 
            segment_index: index
        };
        request.post( 
            { 
                url: 'https://upload.twitter.com/1.1/media/upload.json', 
                oauth: oAuthData,
                formData: formData, 
                json: true 
            }, 
            (err, response, body) => {
                if (err) { reject(err); } 
                else { resolve(); } 
            } 
        );
    } );
};

const finaliseMediaUpload = (mediaId, oAuthData) => {
    return new Promise((resolve, reject) => {
        const formData = {
            command: 'FINALIZE',
            media_id: mediaId,
        };
        
        request.post(
            { 
                url: 'https://upload.twitter.com/1.1/media/upload.json', 
                oauth: oAuthData,
                form: formData, 
                json: true 
            }, 
            (err, response, body) => {
                if (err) { reject(err); } 
                else if (body.error) { reject(body.error); } 
                else { resolve(body); }
            }
        );
    } );
};

const statusMediaUpload = (mediaId, secsToWait, oAuthData) => {
    return new Promise((resolve, reject) => {
        const formData = {
            command: 'STATUS',
            media_id: mediaId,
        };
        let intervalId = setInterval(() => {
            request.get(
                { 
                    url: 'https://upload.twitter.com/1.1/media/upload.json', 
                    oauth: oAuthData,
                    form: formData, 
                    json: true 
                }, 
                (err, response, body) => {
                    if (err) { reject(err); } 
                    else if (body.error) { reject(body.error); } 
                    else {
                        if (body.processing_info.state != 'pending' 
                        && body.processing_info.state != 'in_progress') {
                            clearInterval(intervalId);
                            resolve(body);
                        }
                        else {
                            console.log("Upload percent: " 
                                    + body.processing_info.progress_percent);
                            secsToWait = body.processing_info.check_after_secs; 
                        }
                    }
                }
            );
        }, 1000 * secsToWait );
    } );
};

const publishMediaUpload = (mediaId, text, oAuthData) => {
    return new Promise((resolve, reject) => {
        const qs = {
            status: text,
            media_ids: mediaId,
        };
        request.post(
            { 
                url: 'https://api.twitter.com/1.1/statuses/update.json', 
                oauth: oAuthData,
                qs: qs, 
                json: true 
            }, 
            (err, response, body) => {
                if (err) { reject(err); } 
                else { resolve(body); }
            }
        );
    } );
}

const tweetVideo = (file, text, oAuthData) => {
    return new Promise(async (resolve, reject) => {
            let filestats, 
            fileSize = 0, 
            filenames, 
            mediaId,
            media,
            response,
            state;
            
            try {
                filenames = await splitFile.splitFileBySize(
                            file.base_path  + file.path_media_ext, 5000000);
                for (let i = 0; i < filenames.length; i++) {
                    filestats = await fs.stat(filenames[i]);
                    fileSize += filestats.size;
                }

                response = await initMediaUpload(file, oAuthData, fileSize);
                mediaId = response.media_id_string;

                for (let i = 0; i < filenames.length; i++) {
                    media = fs.createReadStream(filenames[i]);
                    await chunkMediaUpload(mediaId, media, i, oAuthData);
                }

                response = await finaliseMediaUpload(mediaId, oAuthData);
                if (response.processing_info) {
                    response = await statusMediaUpload(
                                    mediaId, 
                                    response.processing_info.check_after_secs, 
                                    oAuthData
                                    );
                    state = response.processing_info.state;
                    console.log('PROCESSING STATE: ' + state);
                }
                if (state == 'succeeded') {
                    response = await publishMediaUpload(mediaId, text, oAuthData);
                }
            }
            catch (err) {
                reject(err);
            }
            resolve(response);
        }
    );
};

const removeTempFiles = () => {
    let rm;

    return new Promise((resolve, reject) => {
        glob(`${file.base_path}storage-temp/*`, (err, files) => {
            if (err) { reject(err); } 
            else {
                for (let file of files) {
                    rm = spawn('rm', [file]);
                    
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
                resolve();
            }
        } );
    } );
};


/**
 * Runs the Twitter bot.
 */                              
let run = function() 
{
    const file = {
        base_path: '/home/rg/Programming/javascript/twitter-interval-motion-cam/',
        path_media_ext: 'storage-temp/01.mp4',
        mimetype: 'video/mp4'
    };
    const oAuthData = {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_KEY_SECRET,
        token: process.env.ACCESS_TOKEN,
        token_secret: process.env.ACCESS_TOKEN_SECRET
    };
    let statusText;
    let response;

    // Spawning motion process
    const motion = spawn('motion', ['-c', `${file.base_path}motion.conf`]);

    setTimeout(() => {
    
        // Killing motion process
        console.log('Killing motion');
        motion.kill();

        // Checking if motion-detected footage was saved
        glob(`${file.base_path}storage-temp/01.mp4`, async (err, files) => {
            if (err) {
                console.error(err);
            } 
            else if (files.length > 0) {
                statusText = 'Testing interval motion camera | ' 
                        + new Date().toLocaleString('AU');
            
                try {
                    // Uploading video to Twitter
                    response = await tweetVideo(file, statusText, oAuthData);
                    console.log(response);
                    await removeTempFiles();
                }
                catch (err) {
                    console.error(err);
                }
            } 
            else {
                statusText = 'Testing interval motion camera - '
                        + 'NO MOTION DETECTED OR VIDEO FILE NOT FOUND | ' 
                        + new Date().toLocaleString('AU');

                try {
                    response = await tweetText(statusText, oAuthData);
                    console.log(response);    
                }
                catch (err) {
                    console.error(err);
                }
            }
        });
    }, 1000 * 60);

    motion.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    motion.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    motion.on('close', (code) => {
        console.log(`motion exited with code ${code}`);
    });
}

run();
setInterval(() => {
  run();
}, 1000 * 60 * 30);

