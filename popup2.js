// ========== 高级设置分页导航 ==========
(function() {
  var page1 = document.getElementById('page1');
  var page2 = document.getElementById('page2');
  var pagePrev = document.getElementById('pagePrevBtn');
  var pageNext = document.getElementById('pageNextBtn');
  var pageIndicator = document.getElementById('pageIndicator');
  var currentPage = 1;

  function showPage(num) {
    currentPage = num;
    if (page1) page1.style.display = num === 1 ? 'block' : 'none';
    if (page2) page2.style.display = num === 2 ? 'block' : 'none';
    if (pagePrev) pagePrev.disabled = num === 1;
    if (pageNext) pageNext.disabled = num === 2;
    if (pageIndicator) pageIndicator.textContent = num + ' / 2';
  }

  if (pagePrev) {
    pagePrev.addEventListener('click', function() {
      if (currentPage > 1) showPage(currentPage - 1);
    });
  }
  if (pageNext) {
    pageNext.addEventListener('click', function() {
      if (currentPage < 2) showPage(currentPage + 1);
    });
  }
  showPage(1);
})();
