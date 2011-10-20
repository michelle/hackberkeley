$(window).load(function(){

  $("#topmenu a").mouseenter(function() {
    $("#topmenu a").stop().animate({"color": '#4e6e74'});
    $("#bg").stop().animate({
      "left" : $(this).position().left + 250,
      "width" : $(this).width() + 30
    });
    $(this).stop().delay(150).animate({"color": '#fafbe7'});
  });
  
  var curLink = $('#topmenu a[href="/<%-page%>"]');
  $("#bg").css({
    "left" : curLink.position().left + 250,
    "width" : curLink.width() + 30
  });
  
  $(".icon").hover(function() {
    $(this).animate( {
      "opacity" : 0.6
    });
  }, function() {
    $(this).animate( {
      "opacity" : 1.0
    });
  });
  
  $("#email, #emailhome").keypress(function(e){
    if(e.which === 13) {
      sendEmail();
    }
  });
  $("#mailinglist, #mailinglisthome").click(sendEmail);
  
});

function sendEmail(){
  var email = $("#email").val() || $("#emailhome").val();
  $("#e").val(email);
  $("#list").submit();
}

function validateEmail(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
} 