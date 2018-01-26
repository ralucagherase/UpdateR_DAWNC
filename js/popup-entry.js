$(function () {
    BG.hideDesktopNotification();
    if(getSettings(SETTINGS.animations_disabled))$.fx.off=true;
    //applyLocalization();
    setUpHandlers();
    fillNotifications();
});