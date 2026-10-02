(function () {
  function initComprobanteDropzone() {
    const input = document.getElementById('transfer-comprobante');
    const dropzone = document.getElementById('transfer-comprobante-dropzone');
    const previewWrap = document.getElementById('transfer-comprobante-preview-wrap');
    const preview = document.getElementById('transfer-comprobante-preview');
    const label = document.getElementById('transfer-comprobante-label');

    if (!input || !dropzone || !previewWrap || !preview) return;

    const activeClasses = ['border-[#0252A4]', 'border-[#5A7AF3]', 'bg-white'];

    function setPreview(file) {
      if (input.disabled) return;
      if (!file || !file.type || !file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = function (event) {
        preview.src = event.target && event.target.result ? event.target.result : '';
        previewWrap.classList.remove('hidden');
        if (label) label.textContent = file.name || 'Comprobante seleccionado';
      };
      reader.readAsDataURL(file);
    }

    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      setPreview(file);
    });

    ['dragenter', 'dragover'].forEach(function (eventName) {
      dropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        if (input.disabled) return;
        activeClasses.forEach(function (className) { dropzone.classList.add(className); });
      });
    });

    ['dragleave', 'drop'].forEach(function (eventName) {
      dropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        activeClasses.forEach(function (className) { dropzone.classList.remove(className); });
      });
    });

    dropzone.addEventListener('drop', function (event) {
      if (input.disabled) return;
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;

      if (window.DataTransfer) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
      }

      setPreview(file);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComprobanteDropzone);
  } else {
    initComprobanteDropzone();
  }
})();
