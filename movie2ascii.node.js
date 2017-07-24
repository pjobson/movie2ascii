#!/usr/bin/env node

'use strict';

// Required: jp2a, ffmpeg
const fs          = require('fs');                              // https://nodejs.org/api/fs.html
const path        = require('path');                            // https://nodejs.org/docs/latest/api/path.html

const mkdirp      = require('mkdirp');                          // https://github.com/substack/node-mkdirp
const cp          = require('cp');                              // https://github.com/stephenmathieson/node-cp
const Q           = require('q');                               // https://github.com/kriskowal/q
const jp2a        = require('jp2a');                            // https://github.com/lsvx/node-jp2a
const ffmpeg      = require('fluent-ffmpeg');                   // https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
const figlet      = require('figlet');                          // https://github.com/patorjk/figlet.js
const argv        = require('minimist')(process.argv.slice(2)); // https://github.com/substack/minimist
const connect     = require('connect');                         // https://github.com/senchalabs/connect
const serveStatic = require('serve-static');                    // https://github.com/expressjs/serve-static
const open        = require('open');                            // https://github.com/jjrdn/node-open
const find        = require('find');                            // https://github.com/yuanchuan/find
const ytdl        = require('youtube-dl');                      // https://github.com/fent/node-youtube-dl
const filesize    = require('filesize');                        // https://github.com/avoidwork/filesize.js
const which       = require('which');                           // https://github.com/npm/node-which
const columnify   = require('columnify');                       // https://github.com/timoxley/columnify

let global = {
	encoderCount: 5,
	errors: false,
	fps: false,
	path: {
		top: null,
		mp3: 'mp3',
		img: 'img',
		txt: 'txt',
		ass: 'assets',
		tmp: 'temp'
	},
	execInPath: {
		jp2a:   false,
		ffmpeg: false
	},
	has: {
		video: false,
		audio: false
	},
	waitChrs: ['\u2058','\u2059'],
	watermark: false,
	help: false,
	font: 'Standard',
	info: {
		fontlist:   false,
		fontsample: false,
		formats:    false,
		codecs:     false
	},
	ascii: {
		flipx:  false,
		flipy:  false,
		border: false,
		width:  180
	},
	frameCount:     0,
	htmlTitle:      null,
	browserpreview: false,
	movieURL:       false,
	jpegs:          []
};

const initParser = () => {
	Q.fcall(() => {
		// General Config
		global.movie             = argv.movie          || false;
		global.movieURL          = argv.movieURL       || false;
		global.watermark         = argv.watermark      || false;
		global.htmlTitle         = global.watermark    || "ASCII Movie";
		global.font              = argv.font           || global.font;
		global.help              = argv.help           || false;
		global.browserpreview    = argv.browserpreview || false;
		global.encoderCount      = argv.encoderCount   || global.encoderCount;

		// ASCII Config
		global.ascii.flipx       = argv.flipx          || global.ascii.flipx;
		global.ascii.flipy       = argv.flipy          || global.ascii.flipy;
		global.ascii.width       = argv.width          || global.ascii.width;
		global.ascii.border      = argv.border         || global.ascii.border;

		// Top Paths
		global.path.top          = argv.path           || './ascii_movie';
		global.path.top          = path.resolve(global.path.top.replace(/\s+/g,'_'));

		// Capability Options
		global.info.fontlist     = argv.fontlist       || false;
		global.info.fontsample   = argv.fontsample     || false;
		global.info.formats      = argv.formats        || false;
		global.info.codecs       = argv.codecs         || false;
	})
	.then(() => {
		// Check for jp2a
		let deferred = Q.defer();
		which('jp2a', (error, resolvedPath) => {
			global.execInPath.jp2a = (!!resolvedPath);
			deferred.resolve();
		});
		return deferred.promise;
	})
	.then(() => {
		// Check for ffmpeg
		let deferred = Q.defer();
		which('ffmpeg', (error, resolvedPath) => {
			global.execInPath.ffmpeg = (!!resolvedPath);
			deferred.resolve();
		});
		return deferred.promise;
	})
	.then(checkForErrors)
	.catch((errors) => {
		console.log(errors);
	})
	.done(() => {
		if (global.errors) {
			process.exit();
		}
		startProcessor();
	});

};

const checkForErrors = () => {
	let deferred = Q.defer();
	if (global.info.fontlist || global.info.formats || global.info.codecs || global.info.fontsample) {
		global.errors = true;
		showInfoPage(deferred);
	} else if (argv.help) {
		global.errors = true;
		usage(deferred);
	} else if (global.movie === false && global.movieURL === false) {
		global.errors = true;
		usage(deferred);
	} else if (global.movie !== false && global.movieURL !== false) {
		global.errors = true;
		usage(deferred);
	} else {
		deferred.resolve();
	}
	return deferred.promise;
};

const startProcessor = () => {
	Q.fcall(() => {
		console.log('ASCIIFICATION STARTED');
		// Render the FIGlet
		if (global.watermark) {
			renderFIGlet();
		}
	})
	.then(makePaths)
	.then(downloadMovie)
	.then(copyMovie)
	.then(probeVideo)
	.then(ripAudio)
	.then(ripVideo)
	.then(findJpegs)
	.catch( (errors) => {
		console.log(errors);
		process.exit();
	})
	.done(asciifyImages);
};

// 	let deferred = Q.defer();
//  deferred.resolve();
//  deferred.reject('msg');
// 	return deferred.promise;

const asciifyImages = () => {
	console.log('\tASCII-ifing images.');
	// Spinning up X encoders
	for (var i=0;i<global.encoderCount;i++) {
		asciifyAnImage();
	}
};

const asciifyAnImage = () => {
	if (global.jpegs.length===0) {
		return;
	}
	console.log(`\t\tImage #${global.jpegs.length}`);
	try {
		let opts = [global.jpegs.pop(),`--width=${global.ascii.width}`];
		!global.ascii.flipx  || opts.push("--flipx");
		!global.ascii.flipx  || opts.push("--flipx");
		!global.ascii.flipy  || opts.push("--flipy");
		!global.ascii.border || opts.push("--border");
	} catch(er) {
		// This will hit if we try to asciify the last image twice
		return;
	}
	asciifyAnImage();
	// jp2a(opts, (output) => {
	// 	watermarker(output, opts[0]);
	// });

};

const watermarker = (frame, jpgFileName) => {
	if (global.watermark !== false) {
		frame = frame.split(/\n/);
		frame.pop();
		// each line of the watermark
		for (let i=0;i<global.watermark.length;i++) {
			// Split Frame into array
			let currFrame = frame[(frame.length - global.watermark.length + i)].split('');
			// Split ascii global.watermark into array
			let currArt   = global.watermark[i].split('');
			// Get a start position, offset 5 characters from right border
			let xPOS  = currFrame.length - 5 - currArt.length + 1;

			for (let j=0;j<currArt.length;j++) {
				// Replace characters which aren't spaces
				if (currArt[j] !== ' ') {
					currFrame[xPOS+j] = currArt[j];
				}
			}

			// Join the currFrame back together and stuff it back into the frame
			frame[(frame.length - global.watermark.length + i)] = currFrame.join('');
		}
		// join entire frame back together
		frame = frame.join('\n');
	}
	writeFile(frame, jpgFileName);
};

const writeFile = (frame, jpgFileName) => {
	// rename the jpg to text and put it in proper place
	let txtFileName = jpgFileName.replace(/.+(img\.\d+)\.jpg/,'$1');
	txtFileName = `${global.path.top}/${global.path.txt}/${txtFileName}.txt`;
	fs.writeFile(fname, frame, () => {
		process.stdout.write(global.waitChrs[Math.floor(Math.random() * 2)]);
	});
};


/*

var cleanUp = function() {
	// delete old jpegs.
	console.log('\tRemoving JPGs')
	fs.remove((global.path.top+global.path.img), function() {
		buildHTML();
	});
};

var buildHTML = function() {
	var htmlTemplatePath = __dirname +'/htmlTemplate/';
	// Copy assets
	console.log('\tCopying Assests');
	find.eachfile(/.+/,htmlTemplatePath+'assets/', function(from) {
		var to = global.path.top+global.path.ass+from.replace(/.+\/(.+?\.(\w+))$/,'$1');
		fs.copy(from,to,function(err) {
			if (err) throw err;
		});
	});

	// Build HTML Page
	console.log('\tBuilding HTML Page');
	fs.readFile(htmlTemplatePath+'index.html', { encoding: 'utf8' }, function (err, html) {
		if (err) throw err;

		html = html.replace(/__TITLE__/g,global.htmlTitle);
		html = html.replace(/__LAST_FRAME__/,global.frameCount);
		html = html.replace(/__FPS__/g,global.fps);

		console.log('\tSaving HTML');
		fs.writeFile(global.path.top+'index.html', html, { encoding: 'utf8' }, function (err) {
			console.log("\tDone Writing");
			console.log("Your files are here: "+ global.path.top);
			kickOffWebServer();
		});
	});
};

var printDone = function() {
	console.log('DONE ASCIIFICATION');
};

var kickOffWebServer = function() {
	if (global.browserpreview) {
		// Kicks off web server on port 8989 and opens a browser.
		connect().use(serveStatic(global.path.top)).listen(8989);
		console.log("Serving movie at: http://localhost:8989/");
		console.log("CTRL+C to quit");
		open('http://localhost:8989/');
	} else {
		printDone();
	}
};



*/

const makePaths = () => {
	const deferred = Q.defer();
	console.log("\tMaking directories.");
	mkdirp.sync(`${global.path.top}/${global.path.mp3}`); // mp3 path
	mkdirp.sync(`${global.path.top}/${global.path.img}`); // image path
	mkdirp.sync(`${global.path.top}/${global.path.txt}`); // text files path
	mkdirp.sync(`${global.path.top}/${global.path.ass}`); // assets path
	mkdirp.sync(`${global.path.top}/${global.path.tmp}`); // temp path
	deferred.resolve();
	return deferred.promise;
};

const copyMovie = () => {
	const deferred = Q.defer();
	if (!!global.movieURL) {
		// User specified remote movie
		deferred.resolve();
		return deferred.promise;
	}
	console.log("\tCopying movie to temp.");
	const movieFileName = global.movie.split('/').pop();
	cp(global.movie, `${global.path.top}/${global.path.tmp}/${movieFileName}`, () => {
		global.movie = `${global.path.top}/${global.path.tmp}/${movieFileName}`;
		return deferred.resolve();
	});
	return deferred.promise;
};

const downloadMovie = () => {
	let deferred = Q.defer();

	if (!global.movieURL) {
		// User specified local movie
		deferred.resolve();
		return deferred.promise;
	}
	// Switch to http.
	global.movieURL = global.movieURL.replace(/https:/,'http:');
	let formatID = 0;

	ytdl.getInfo(global.movieURL, [], (err, info) => {
		console.log('\tGetting video info.');
		if (err) {
			deferred.reject(err);
		}
		global.movie = `${global.path.top}/${global.path.tmp}/${info._filename}`;

		let vidPixels = 0;
		info.formats.forEach((format) => {
			// if no video codec
			if (format.vcodec==='none') return;
			// if no audio codec
			if (format.acodec==='none') return;
			// if no height or width data
			if (!format.height || !format.width) return;
			// if this isn't an mp4
			if (format.ext !== 'mp4') return;

			format.format_id = parseInt(format.format_id,10);
			let hw = format.width*format.height;
			if (vidPixels < hw) {
				vidPixels = hw;
				formatID = format.format_id;
			}
		});

		// If no video is found stop here.
		if (formatID===0) {
			deferred.reject('Error: Could not find video file in the metadata.');
		}

		let interval;
		let video = ytdl(global.movieURL,
			['--format='+ formatID],
			{ cwd: __dirname }
		);

		video.on('error', (error) => {
			deferred.reject(error);
		});

		video.on('info', (info) => {
			console.log('\tDownload started');
			console.log('\t\tFile size: ' + filesize(info.size));
			interval = setInterval(() => {
				process.stdout.write(global.waitChrs[Math.floor(Math.random() * 2)]);
			},500);
		});

		video.pipe(fs.createWriteStream(`${global.movie}`));

		video.on('end', () => {
			clearInterval(interval);
			console.log('');
			console.log('\tVideo Downloaded');
			deferred.resolve();
		});
	});
	return deferred.promise;
};



const probeVideo = () => {
	// Probe video.
	let deferred = Q.defer();
	console.log('\tProbing video.');

	ffmpeg.ffprobe(global.movie, (err, metadata) => {
		metadata.streams.forEach((stream) => {
			global.has[stream.codec_type] = true;
			if (stream.codec_type === 'video') {
				global.fps = stream.r_frame_rate.split('/');
				global.fps = parseFloat(global.fps[0]) / parseFloat(global.fps[1]);
				global.fps = Math.floor(global.fps/10)*10; // round down to the nearest 10's place
			}
		});

		// If no video data, stop here.
		if (global.has.video === false) {
			deferred.reject('Error: Movie file does not have any video data associated with it.');
		}

		// If couldn't detect FPS, just set to 20.
		global.fps = global.fps || 20;

		deferred.resolve();
	});

	return deferred.promise;
};

const ripAudio = () => {
	let deferred = Q.defer();

	let audio = new ffmpeg(global.movie)
		.noVideo()
		.audioChannels(2)
		.audioBitrate('128k')
		.audioCodec('libmp3lame')
		.fps(global.fps)
		.outputOptions(['-f mp3'])
		.output(`${global.path.top}/${global.path.mp3}/audio.mp3`)
		.on('start', () => {
			console.log('\tRipping MP3.')
		})
		.on('end', () => {
			console.log('\tFinished ripping MP3s.');
			deferred.resolve();
		})
		.on('progress', (progress) => {
			process.stdout.write(global.waitChrs[Math.floor(Math.random() * 2)]);
		})
		.run();

	return deferred.promise;
};

const ripVideo = () => {
	let deferred = Q.defer();

	let video = new ffmpeg(global.movie)
		.noAudio()
		.fps(global.fps)
		.output(`${global.path.top}/${global.path.img}/img.%10d.jpg`)
		.on('start', () => {
			console.log('\tRipping JPGs.')
		})
		.on('end', () => {
			console.log('\tFinished ripping JPGs.');
			deferred.resolve();
		})
		.on('progress', (progress) => {
			process.stdout.write(global.waitChrs[Math.floor(Math.random() * 2)]);
		})
		.run();

	return deferred.promise;
};

const renderFIGlet = () => {
	// render watermark
	console.log('\tRendering watermark.');
	figlet.text(global.watermark, {
		font: global.font
	}, (err, data) => {
		if (err) {
			return;
		}
		global.watermark = data.split(/\n/);
		return;
	});
};

const findJpegs = () => {
	let deferred = Q.defer();

	// find images in img folder
	find.eachfile(/\.jpg$/,(`${global.path.top}/${global.path.img}`), (jpg) => {
		global.jpegs.push(jpg);
	}).end(() => {
		global.frameCount = global.jpegs.length;
		deferred.resolve();
	});

	return deferred.promise;
};

const usage = (deferred) => {
  console.log(`
  Usage:

       ./movie2ascii.node.js --movie name_of_movie.ext

  General:

    --help
      (optional) Shows this page.

  Configuration Options:

    --browserpreview
      (optional) Automatically stands up server and opens browser when done.

    --movie whatever_movie.ext
      Name of your movie file.
      To see what your install of ffmpeg supports use: --formats

    --movieURL https://www.youtube.com/watch?v=SOME_VIDEO_ID
      (optional) URL of video, use this instead of --movie.

    --path /path/to/output/to/
      (optional) Name of path to build to, creates path based on movie file name by default.

    --watermark "Some Text"
      (optional) Watermarks the bottom of the image.

    --font name_of_font
      (optional) Watermarks the bottom of the image.


  ASCII Options:

    --border
      (optional) Use to add a border to the ASCII.

    --flipx
      (optional) Flip X Axis.

    --flipy
      (optional) Flip Y Axis.

    --width
      (optional) Number of characters in width, scales height automagically, default: 180.


  Capability Options:
  These do no video processing, even if you include other options. They may help to determine issues.

    --fontlist
      (optional) Lists available fonts.

    --formats
      (optional) Lists available video formats.

    --codecs
      (optional) Lists available video codecs.

    --fontsample=Standard
      (optional) Shows a sample of the requested font.
  `);
  return deferred.resolve();
};

const showInfoPage = (deferred) => {
	// { fontlist: true/false, formats: true/false, codecs: true/false }
	if (global.info.fontsample) {
		console.log(`Sample of: ${global.info.fontsample}\n`);
		figlet.text(global.info.fontsample , {
			font: global.info.fontsample
		}, (err, data) => {
			if (err) {
				console.log(err);
				deferred.reject(err);
			} else {
				console.log(data);
				return deferred.resolve();
			}
		});
	}
	// List of Figlet Fonts
	if (global.info.fontlist) {
		console.log('Available fonts:');
		figlet.fonts((err, fonts) => {
			let fout = [];

			fonts.forEach( (font, idx) => {
				if (idx%6 === 0) {
					fout.push([]);
				}
				fout[fout.length-1].push(font);
			});

			console.log(columnify(fout, {
				showHeaders: false
			}));

			return deferred.resolve();
		});
	}
	// List of FFMPEG Decodable Formats
	if (global.info.formats) {
		ffmpeg.getAvailableFormats((err, formats) => {
			console.log('Available read formats:');
			for (const k in formats) {
				if(formats[k].canDemux) {
					console.log(`    - ${k}`);
				}
			}
			return deferred.resolve();
		});
	}
	// List of FFMPEG Decodable Codecs
	if (global.info.codecs) {
		ffmpeg.getAvailableCodecs((err, codecs) => {
			ffmpeg.getAvailableCodecs((err, codecs) => {
				console.log('Available read codecs:');
				for (const k in codecs) {
					if(codecs[k].canDecode) {
						console.log(`    - ${k}`);
					}
				}
				return deferred.resolve();
			});
		});
	}
};

// DOO EET!
initParser();
