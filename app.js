const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('#mobile-menu');

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  menuButton.setAttribute('aria-label', open ? '메뉴 열기' : '메뉴 닫기');
  mobileMenu.hidden = open;
});

document.querySelectorAll('.mobile-menu a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileMenu.hidden = true;
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', '메뉴 열기');
  });
});

document.querySelectorAll('[data-open-dialog]').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const dialog = document.getElementById(button.dataset.openDialog);
    dialog?.showModal();
  });
});

document.querySelectorAll('.dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    const form = dialog.querySelector('form');
    form?.reset();
  });
});

document.querySelectorAll('.dialog form').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const dialog = form.closest('dialog');
    const submitButton = form.querySelector('.button');
    if (submitButton) submitButton.textContent = dialog.id === 'contact-dialog' ? '문의가 접수되었습니다' : '검색 준비 중';
    window.setTimeout(() => dialog.close(), 900);
  });
});
