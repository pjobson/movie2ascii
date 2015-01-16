
// play is called when play button is pressed or after seeking
// seeked doesn't work in chrome for some reason, so i use this instead.
$('#audio').bind('play', function(ev) {
	var el = ev.currentTarget;
	var curSec = parseInt(el.currentTime,10);
	// set current time to nearest interger, mainly to simplify guessing the frame.
	el.currentTime = curSec;

	// get current frame: frames per second * current second
	// +1 -- 0 time frame is 1.
	counter.frame = parseInt(counter.fps * curSec,10) + 1;
	startMovie();
});

$('#audio').bind('pause', function(ev) {
	stopMovie();
});

var startMovie = function() {
	window.timer = window.setInterval(function() {
		counter.frame++;
		if (counter.frame > counter.last) {
			stopMovie();
			return;
		}
		getFrame(counter.frame);
	}, counter.timeout);
};

var stopMovie = function() {
	window.clearInterval(window.timer);
};

var prefetchFrames = function() {
	for (var i=1;i<(counter.last+1);i++) {
		// console.log(i);
	}
};
// prefetchFrames();

var getFrame = function() {
	// Files are as such: img.0000000000.txt
	function framePadding() {
		var f = String(counter.frame);
		while (f.length<10) {
			f = '0'+f;
		}
		return f;
	};
	$.ajax({
		url: 'txt/img.'+ framePadding() +'.txt',
		success: function(res) {
			$('#movie').html(res);
		}
	});
};
