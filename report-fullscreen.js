(() => {
  const frame = document.getElementById('milestone2-report-frame');
  const button = document.getElementById('report-fullscreen');
  if (!frame || !button) return;

  const reportUrl = frame.getAttribute('src');

  const updateLabel = () => {
    button.textContent = document.fullscreenElement === frame
      ? 'Exit full-screen'
      : 'Full-screen Milestone 2';
  };

  button.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (frame.requestFullscreen) {
        await frame.requestFullscreen();
      } else {
        window.open(reportUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      window.open(reportUrl, '_blank', 'noopener,noreferrer');
    }
    updateLabel();
  });

  document.addEventListener('fullscreenchange', updateLabel);
  updateLabel();
})();
