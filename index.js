const { spawn } = require('node:child_process');
const fs = require('fs-extra');
const request = require('request');
const glob = require('glob');
const splitFile = require('split-file');
const { reject } = require('bluebird');
require('dotenv').config();

/**
 * Tweets text to Twitter.
 */
const tweetText= function(text) 
{
    return new Promise((resolve, reject) => 
        {
            // The form data
            const formData = {
                status: text
            };
            // The authentication data
            const oAuthData = {
                consumer_key: process.env.CONSUMER_KEY,
                consumer_secret: process.env.CONSUMER_KEY_SECRET,
                token: process.env.ACCESS_TOKEN,
                token_secret: process.env.ACCESS_TOKEN_SECRET
            };
            request.post(
                { 
                    url: 'https://api.twitter.com/1.1/statuses/update.json', 
                    oauth: oAuthData,
                    form: formData, 
                    json: true 
                }, 
                (err, response, body) =>
                {
                    if (err) 
                    { 
                        reject(err); 
                    }
                    else 
                    { 
                        resolve(body); 
                    }
                }
            );
        }
    )
};

const initMediaUpload = (file, oAuthData, fileSize) =>
{
    return new Promise((resolve, reject) =>
        {
            // The form data
            const formData = {
                command: 'INIT',
                total_bytes: fileSize,
                media_type: file.mimetype,
                media_category: 'tweet_video'
            };

            // Sending the video size
            request.post(
                { 
                    url: 'https://upload.twitter.com/1.1/media/upload.json', 
                    oauth: oAuthData,
                    form: formData, 
                    json: true 
                }, 
                (err, response, body) => 
                {
                    if (err)
                    {
                        reject(err);
                    }
                    else
                    {
                        resolve(body.media_id_string);
                    }
                }
            );
        }
    );
}

const chunkMediaUpload = (mediaId, media, index, oAuthData) =>
{
    return new Promise((resolve, reject) => 
        {
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
                (err, response, body) => 
                {
                    if (err) 
                    {
                        reject(err);
                    } 
                    else
                    {
                        resolve();
                    } 
                }
            );
        }
    );
};

const finaliseMediaUpload = (mediaId, oAuthData) =>
{
    return new Promise((resolve, reject) =>
        {
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
                (err, response, body) => 
                    {
                        if (err) 
                        {
                            reject(err);
                        } 
                        else if (body.error) 
                        {
                            reject(body.error);
                        } 
                        else 
                        {
                            resolve(body);
                        }
                    }
                );
        }
    );
};

const statusMediaUpload = (mediaId, secs_to_wait, oAuthData) =>
{
    return new Promise((resolve, reject) =>
        {
            const formData = {
                command: 'STATUS',
                media_id: mediaId,
            };
            request.get(
                { 
                    url: 'https://upload.twitter.com/1.1/media/upload.json', 
                    oauth: oAuthData,
                    form: formData, 
                    json: true 
                }, 
                (err, response, body) => 
                {
                    if (err) 
                    {
                        reject(err);
                    } 
                    else if (body.error) 
                    {
                        reject(body.error);
                    } 
                    else
                    {
                        let intervalId = setInterval(() =>
                            {
                                if (body.processing_info.state != 'pending' && body.processing_info.state != 'in_progress')
                                {
                                    clearInterval(intervalId);
                                    resolve(body.processing_info);
                                }
                            },
                            1000 * secs_to_wait
                        );
                    }
                }
            );
        }
    );
};

const publishMediaUpload = (mediaId, text, oAuthData) =>
{
    return new Promise((resolve, reject) =>
        {
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
                (err, response, body) => 
                {
                    if (err) 
                    {
                        reject(err);
                    } 
                    else 
                    {
                        resolve(body);
                    }
                }
            );
        }
    );
}

/**
 * Tweets a video to Twitter.
 */

const tweetVideo = (file, text) =>
{
    return new Promise(async (resolve, reject) => 
        {
            // The authentication data
            const oAuthData = {
                consumer_key: process.env.CONSUMER_KEY,
                consumer_secret: process.env.CONSUMER_KEY_SECRET,
                token: process.env.ACCESS_TOKEN,
                token_secret: process.env.ACCESS_TOKEN_SECRET
            };
            let filestats;
            let fileSize = 0;
            let names = [];
            let mediaId;
            let media;
            let response;
            let state;
            
            try {

                // filestats = await fs.stat(file.base_path  + file.path_media_ext);
                // fileSize += filestats.size;

                names = await splitFile.splitFileBySize(file.base_path  + file.path_media_ext, 5000000);
                for (let name = 0; name < names.length; name++)
                {
                    filestats = await fs.stat(names[name]);
                    fileSize += filestats.size;
                }
                mediaId = await initMediaUpload(file, oAuthData, fileSize);
                for (let name = 0; name < names.length; name++)
                {
                    media = fs.createReadStream(names[name]);
                    await chunkMediaUpload(mediaId, media, name, oAuthData);
                }
                response = await finaliseMediaUpload(mediaId, oAuthData);
                state = response.processing_info.state;
                if (response.processing_info)
                {
                    response = await statusMediaUpload(mediaId, response.processing_info.check_after_secs, oAuthData);
                    state = response.state;
                    console.log('PROCESSING_INFO:');
                    console.log(response);
                }
                if (state != 'failed')
                {
                    response = await publishMediaUpload(mediaId, text, oAuthData);
                }
            }
            catch (err)
            {
                reject(err);
            }
            resolve(response);
        }
    );
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

    // Spawning motion process
    const motion = spawn('motion', ['-c', `${file.base_path}motion.conf`]);

    // Uploading saved video after waiting a bit 
    setTimeout(function()
    {
    
        // Killing motion process
        console.log('Killing motion');
        motion.kill();

        // Checking if motion-detected footage was saved
        glob(`${file.base_path}storage-temp/01.mp4`, async (err, files) => 
        {
            // The keys for twitter auth
            const KEYS = {
                token: process.env.ACCESS_TOKEN,
                token_secret: process.env.ACCESS_TOKEN_SECRET
            };
            let text; // The text for the tweet
            
        
            if (err) 
            {
                console.error(err);
            } 
            else if (files.length > 0) 
            {
                text = 'Testing interval motion camera | ' 
                        + new Date().toLocaleString('AU');
            
                // Uploading video to Twitter
                await tweetVideo(file, text) 
                .then(response => 
                    {
                        console.log(response);

                        // // Clearing storage
                        // glob(`${file.base_path}storage-temp/*`, (err, files) =>
                        //     {
                        //         if (err) 
                        //         {
                        //             console.error(err);
                        //         } 
                        //         else 
                        //         {
                        //             for (let file of files) 
                        //             {
                        //                 let rm = spawn('rm', [file]);
                                        
                        //                 rm.stdout.on('data', (data) => {
                        //                     console.log(`stdout: ${data}`);
                        //                 });
                                    
                        //                 rm.stderr.on('data', (data) => {
                        //                     console.error(`stderr: ${data}`);
                        //                 });
                                    
                        //                 rm.on('close', (code) => {
                        //                     console.log(`rm exited with code ${code}`);
                        //                 });
                        //             }
                        //         }
                        //     }
                        // );
                    }
                ).catch(err => 
                    {
                        console.error(err);
                    }
                );
            } 
            else 
            {
                text = 'Testing interval motion camera - '
                        + 'NO MOTION DETECTED OR VIDEO FILE NOT FOUND | ' 
                        + new Date().toLocaleString('AU');

                // Tweeting status to Twitter
                await tweetText(text)
                .then(response => 
                    {
                        console.log(response);
                    }
                ).catch(err => console.error(err));
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

