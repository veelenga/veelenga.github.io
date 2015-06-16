
$(window).on("load", function() {

  var footerHeight = 0,
      footerTop = 0,
      $footer = $("#footer");

      positionFooter();

  function positionFooter() {

    footerHeight = $footer.height();
    footerTop = ($(window).scrollTop() + $(window).height() - footerHeight) + "px";

    if (($(document.body).height() + footerHeight) < $(window).height()) {
      $footer.clearQueue();
      $footer.css({
        top: $footer.offset().top,
        position: "absolute"
      }).animate({
        top: footerTop
      }, 1000)
    } else {
      $footer.css({
        position: "static"
      })
    }
  }

  $(window)
    .scroll(positionFooter)
    .resize(positionFooter)
});
