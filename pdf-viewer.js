(() => {
  const button = document.querySelector('#pdf-fullscreen');
  const frame = document.querySelector('#pdf-viewer');
  const embed = document.querySelector('#pdf-embed');
  if (!button || !frame || !embed) return;

  const pdfUrl = embed.getAttribute('src').split('#')[0];

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (frame.requestFullscreen) {
        await frame.requestFullscreen();
      } else {
        window.open(pdfUrl, '_blank', 'noopener');
      }
    } catch (error) {
      window.open(pdfUrl, '_blank', 'noopener');
    }
  }

  function updateLabel() {
    button.textContent = document.fullscreenElement ? 'Exit full-screen' : 'Full-screen PDF';
  }

  button.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateLabel);
  updateLabel();
})();
