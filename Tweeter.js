const request = require('request');
const splitFile = require('split-file');
const fs = require('fs-extra');

function Tweeter(oAuthData) {
    this.oAuthData = oAuthData;

    /**
     * Initialises a a chunk video upload to twitter.
     */
    const initVideoUpload = (mediaFile, fileSize) => {
        return new Promise((resolve, reject) => {
            
            // The form data
            const formData = {
                command: 'INIT',
                total_bytes: fileSize,
                media_type: mediaFile.mimetype,
                media_category: 'tweet_video'
            };

            // Initialising media upload
            request.post( 
                { 
                    url: 'https://upload.twitter.com/1.1/media/upload.json', 
                    oauth: this.oAuthData,
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

    const chunkVideoUpload = (mediaId, media, index) => {
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
                    oauth: this.oAuthData,
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

    const finaliseVideoUpload = (mediaId) => {
        return new Promise((resolve, reject) => {
            const formData = {
                command: 'FINALIZE',
                media_id: mediaId,
            };
            
            request.post(
                { 
                    url: 'https://upload.twitter.com/1.1/media/upload.json', 
                    oauth: this.oAuthData,
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

    const statusVideoUpload = (mediaId, secsToWait) => {
        return new Promise((resolve, reject) => {
            const formData = {
                command: 'STATUS',
                media_id: mediaId,
            };
            let intervalId = setInterval(() => {
                request.get(
                    { 
                        url: 'https://upload.twitter.com/1.1/media/upload.json', 
                        oauth: this.oAuthData,
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

    /**
     * Updates Twitter status.
     */
    const updateStatus = (text, mediaIds) => {
        return new Promise((resolve, reject) => {

            let formData = {};
            
            if (text == "" && mediaIds == "") { 
                reject("updateStatus() has no content to post!");
            }

            if (text != "") { 
                formData.text = text; 
            }
            
            if (mediaIds != "") { 
                formData.media_ids = mediaIds; 
            }

            // Updating twitter status
            request.post( 
                { 
                    url: 'https://api.twitter.com/1.1/statuses/update.json', 
                    oauth: this.oAuthData,
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

    this.tweetTextAndVideo = (text, mediaId) => {
        return new Promise(async (resolve, reject) => {
            try {
                resolve(await updateStatus(text, mediaId));
            }
            catch (err) {
                reject(err);
            }
        } );
    };

    this.tweetText = (text) => {
        return new Promise(async (resolve, reject) => {
            try {
                resolve(await updateStatus(text, ""));
            }
            catch (err) {
                reject(err);
            }
        } );
    };

    this.prepVideo = (videoFile) => {
        return new Promise(async (resolve, reject) => {
            let filenames, 
            filestat, 
            fileSize = 0,
            media,
            response,
            videoInfo = {};
            
            try {
                // Splitting the video file into a series of smaller files
                filenames = await splitFile.splitFileBySize(
                    videoFile.path_base  + videoFile.path_extn, 5000000);

                // Getting the combined size of all the files
                for (let file = 0; file < filenames.length; file++) {
                    filestat = await fs.stat(filenames[file]);
                    fileSize += filestat.size;
                }

                // Initialising the video upload
                response = await initVideoUpload(videoFile, fileSize);
                videoInfo.ID = response.media_id_string;

                // Uploading the video files one at a time
                for (i = 0; i < filenames.length; i++) {
                    media = fs.createReadStream(filenames[i]);
                    await chunkVideoUpload(videoInfo.ID, media, i);
                }

                // Finalising the video upload
                response = await finaliseVideoUpload(videoInfo.ID);

                // Presuming the upload was successful
                videoInfo.state = 'succeeded';

                // Waiting for the video to finalise
                if (response.processing_info) {
                    response = await statusVideoUpload(
                                    videoInfo.ID, 
                                    response.processing_info.check_after_secs,
                                    );
                    
                    // Assigning the actual state of the media upload
                    videoInfo.state = response.processing_info.state;
                }
                // Returning the media object we made
                resolve(videoInfo);
            }
            catch (err) {
                // Rejecting any errors that may have happened
                reject(err);
            }
        } );
    };
};

module.exports = Tweeter;