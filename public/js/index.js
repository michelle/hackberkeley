$(window).load(function(){



  
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