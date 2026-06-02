// popup2.html — AI 高级配置页面
(function() {
  var backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      window.location.href = 'popup.html';
    });
  }

  var goToPopupBtn = document.getElementById('goToPopupBtn');
  if (goToPopupBtn) {
    goToPopupBtn.addEventListener('click', function() {
      window.location.href = 'popup.html';
    });
  }
})();
