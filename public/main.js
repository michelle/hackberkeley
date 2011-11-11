var timeLeft = 90;

function correct(){
    $(".correct").show();
}

function wrong(){
    $(".wrong").show();
}

function newQuestion(){
    $(".hidden").hide();
}


var timer;



function refreshTime(){
    $('.time').html(timeLeft);
}


function stopTimer(){
    clearInterval(timer);
}

function startTimer(){
    timer = setInterval(function(){timeLeft--; refreshTime();}, 1000);
}

startTimer();