#!/usr/bin/env node

const os     = require('os');
const path   = require('path');
const argv   = require('minimist')(process.argv.slice(2)); // https://github.com/substack/minimist
const mkdirp = require('mkdirp');                          // https://github.com/substack/node-mkdirp
const mime   = require('mime-types');                      // https://github.com/jshttp/mime-types
const ffmpeg = require('fluent-ffmpeg');                   // https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
const find   = require('find');                            // https://github.com/yuanchuan/find
const im     = require('imagemagick');                     // https://github.com/rsms/node-imagemagick
// const spawn  = require('child_process').spawn;
// const rimraf = require('rimraf');                          // https://github.com/isaacs/rimraf
//


const resolutions = {
	   '4k': '3840x2160',
	'1080p': '1920x1080',
	 '720p': '1280x720',
	 '480p': '852x480',
	 '360p': '480x360',
	 '240p': '320x240',
};

const globals = {
	txtFileList: [],
	frameCount: 0,
	fps: 0,
	tmppath: `${os.tmpdir()}/ascii2movie`,
	font: {
		family: `${__dirname}/fonts/ttf-bitstream-vera-1.10/VeraMono.ttf`,
		color: 'white',
		background: 'black',
		rendersize: '720p'
	},
	runnercount: 100,
	mp3duration: 0,
	zeroPadding: 0
};

const ascii2movieinit = () => {
	globals.help            = argv.help        || false;
	globals.txtpath         = argv.txtpath     || false;
	globals.mp3file         = argv.mp3file     || false;
	globals.title           = argv.title       || "ASCII Movie";
	globals.runnercount     = argv.runnercount || globals.runnercount;
	globals.font.family     = argv.fontfamily  || globals.font.family;
	globals.font.color      = argv.fontcolor   || globals.font.color;
	globals.font.background = argv.background  || globals.font.background;
	globals.font.rendersize = argv.rendersize  || globals.font.rendersize;
	globals.font.rendersize = resolutions[globals.font.rendersize.trim()];

	if (!globals.txtpath || !globals.mp3file || argv.help) {
		usage();
	} else {
		globals.txtpath = path.resolve(argv.txtpath);
		globals.mp3file = path.resolve(argv.mp3file);
		argv.fontfamily = path.resolve(argv.fontfamily);
		startProcessing();
	}
};

const startProcessing = async () => {
	console.log('Starting Up...');

	await mktemp();
	await mp3filetest();
	await findTextFiles();
	const converters = Array(globals.runnercount).fill(text2png);
	await Promise.all(converters.map((cnvrtr, idx) => cnvrtr(`${idx+1}`.padStart(globals.runnercount.toString().length, 0))));


	console.log('eof');
	// console.log(globals);

};

const mktemp = () => {
	console.log(`Making temp directory: ${globals.tmppath}`);
	return new Promise(resolve => {
		mkdirp(globals.tmppath, err => {
			if (err) {
				throw new Error(err);
			}
			resolve();
		});
	});
};

const mp3filetest = () => {
	console.log(`Testing MP3 file: ${globals.mp3file}`);
	return new Promise(resolve => {
		const mp3mime = mime.lookup(globals.mp3file);
		if (mp3mime !== 'audio/mpeg') {
			throw new Error('Error: The specified MP3 file type is not audio/mpeg, most likely an invalid mp3 file.');
		}
		console.log('Getting MP3 Duration...')
		ffmpeg.ffprobe(globals.mp3file, (err, metadata) => {
			if (err) {
				throw new Error(`ffprobe couldn't parse your MP3: ${err}`);
			}
			globals.mp3duration = parseFloat(metadata.format.duration);
			resolve();
		});
	});
};

const findTextFiles = () => {
	console.log(`Finding text files in: ${globals.txtpath}`);
	return new Promise(resolve => {
		find.eachfile(/\.txt$/,(globals.txtpath), txt => {
			globals.txtFileList.push(txt);
		}).end(() => {
			globals.frameCount = globals.txtFileList.length;

			if (globals.frameCount === 0) {
				throw new Error(`Could not find any text files in: ${globals.txtpath}`);
			}

			console.log(`Found ${globals.frameCount} frames.`);

			resolve();
		});
	});
};

const text2png = (idx) => {
	// Recipe for converting a text file to an image.
	// convert \
	//   -background black \
	//   -fill white \
	//   -font ./fonts/ttf-bitstream-vera-1.10/VeraMono.ttf \
	//   label:@./ascii_movie/txt/img.0000011257.txt \
	//   -resize x720 \
	//   -gravity center \
	//   -extent 1280x720 \
	//   file.png
	// console.log('Converting text files to png.');
	this.convertNext = (resolver, runner) => {
		const currentFrame  = globals.txtFileList.shift();
		const pngOutputName = `${globals.tmppath}/${path.parse(currentFrame).base.replace(/\.txt$/, '.png')}`;
		const frameNumber   = parseInt(path.parse(currentFrame).base.split('.')[1], 10);
		if (typeof currentFrame === 'undefined') {
			resolver();
		} else {
			console.log(`➠ Runner ${runner} is processing frame ${frameNumber} of ${globals.frameCount}`);
			im.convert([
				'-background', globals.font.background,
				'-fill',       globals.font.color,
				'-font',       globals.font.family,
				`label:@${currentFrame}`,
				'-resize',     globals.font.rendersize.replace(/^\d+/,''),
				'-gravity',    'center',
				'-extent',     globals.font.rendersize,
				pngOutputName
			], (err, stdout) => {
				if (err) {
					throw new Error(`convert died because: ${err}`);
				} else {
					this.convertNext(resolver, runner);
				}
			});
		}
	};

	return new Promise(resolve => {
		this.convertNext(resolve, idx);
	});
};

const usage = () => {
	const txt = `
Usage:
./ascii2movie.node.js --txtpath /path/to/txt/files/ --mp3file /path/to/mp3/file.mp3

Configuration Options:

  --help (optional)
    Shows this page.

  --title "Name of Your Movie" (optional)
    Title of the movie, defaults to "ASCII Movie".

  --txtpath /path/to/txt/files/
    Name of the path with all of the text files.

  --mp3file /path/to/mp3/file.mp3
    Path to the mp3 file for this video.

  --runnercount ##
    Number of simultaneous imagemagick commands to run.
      Default is 100.

  --fontfamily name_of_font (optional)
    Name of the font to render the images in (you should use a fixed-width font for this).
      Default: Bitstream Vera Sans Mono (VeraMono.ttf)

  --rendersize size_of_video (optional)
    Size of video: 4k, 1080p, 720p, 480p, 360p, 240p
      Default: 720p

  --fontcolor color_of_font (optional)
    Color of font.
      Default: white

  --backgroundcolor background_color (optional)
    Background color.
      Default: black
`;

	console.log(txt);

	process.exit(code=0);
};



ascii2movieinit();

