# twitter-interval-motion-cam
Records motion detected video at intervals and uploads it to twitter.

## Prerequisites

 - You need to have been approved for a [Twitter developer's](https://developer.twitter.com/) account and created an application.

 - [NodeJS](https://nodejs.org/) must be installed on your system.

 - [Motion](https://motion-project.github.io/motion_build.html) must be installed on your system.

## Linux installation:

1. Open a command prompt and run the following commands:
```
$ git clone https://github.com/RichTGale/twitter-interval-motion-cam.git

$ cd twitter-interval-motion-cam
```
you may have to make the ```install``` file executable:
```
$ chmod +x ./install
```
then:
```
$ ./install
```

2. In the base ```twitter-interval-motion-cam``` directory, there is a hidden file called ```.env```. Fill in the ```.env``` file with your Twitter application's authentication details. Here's an example:
```
CONSUMER_KEY=q23yr203rgo23fu023fug3 
CONSUMER_KEY_SECRET=23ruh230r8ug038reghyg4308g34tuhyb
ACCESS_TOKEN=we8yug8uydg2q83ueh2937he293r23r
ACCESS_TOKEN_SECRET=08ugwgfo903ewybf90oweyrg230ygr23ryg230ryg23  
```
Save the ```.env``` file.

## Running
Depending on how you installed NodeJS, you may have to run:
```
$ sudo node index.js
```
or
```
$ sudo nodejs index.js
```

## Uninstalling
Run:
```
rm -rf /path/to/twitter-interval-motion-cam
```

## Notes
 - Depending on whether motion is detected, the default configuration will upload a video that is up to 1 minute in length, once every 3 hours. 

 - The ```upload_freq``` parameter in ```params.js``` has a default value of ```1000 * 60 * 60 * 3``` milliseconds (3 hours). It determines how often this program will attempt to upload recorded videos.

 - The ```movie_max_time``` parameter in ```motion.conf``` determines the maximum length of videos ```motion``` will record. By default it is set to ```600``` seconds (ten minutes). The ```detect_period``` parameter in ```params.js``` is by default set to ```1000 * 60 * 1``` milliseconds (one minute), and controls the "time-window" in which ```motion``` is actively detecting motion to record.<br /><br />To record videos longer than ten minutes, given that ```motion``` is constantly detecting motion for that period:<br />A) Increase the value assigned to ```movie_max_time``` in ```motion.conf```.<br />B) Increase the value assigned to ```detect_period``` in ```params.js```.<br /><br />For example: if ```movie_max_time``` is set to ```1200``` seconds (20 minutes), and ```detect_period``` is set to ```1000 * 60 * 60``` milliseconds (one hour), there will be a one-hour period in which a video could be recorded that is a maximum of 20 minutes in length.<br /><br />However, keep in mind that the amount of time in which to upload a video is limited to Twitter's discretion. Twitter gives a reasonable amount of time, but if this program reports ```"The video failed to upload"``` when attempting to upload larger videos, it may be that the uploading time-limit has been reached.

 - The ```upload_freq``` parameter must be greater than or equal to the ```detect_period``` parameter. An error will be printed if this is not the case. Both parameters may be found in ```params.js```.

 - This program uses ```motion Version 4.4.0```, which at the time of writing, is the newest version. If you are using a newer version, you may have to copy its ```motion.conf``` file, usually located at ```/etc/motion/motion.conf```, to ```/path/to/twitter-interval-motion-cam/motion.conf``` and make appropriate changes to it.
