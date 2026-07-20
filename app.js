const SUPABASE_URL = 'https://kxwwjtsnlobgldrkugay.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4d3dqdHNubG9iZ2xkcmt1Z2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTgzMDEsImV4cCI6MjEwMDA3NDMwMX0.ke-ukrsQlYuk2b8ceLR5bOpZXzrsWVroR24EdnLjVkA';

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
    document.getElementById(button.dataset.openDialog)?.showModal();
  });
});

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog')?.close());
});

document.querySelectorAll('.dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});

document.querySelectorAll('.dialog form:not(#auth-form)').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const dialog = form.closest('dialog');
    const submitButton = form.querySelector('.button');
    if (submitButton) {
      submitButton.textContent = dialog.id === 'contact-dialog' ? '문의가 접수되었습니다' : '검색 준비 중';
    }
    window.setTimeout(() => {
      dialog.close();
      form.reset();
    }, 900);
  });
});

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const authTrigger = document.querySelector('#auth-trigger');
const authTriggerLabel = document.querySelector('#auth-trigger-label');
const signedOutView = document.querySelector('#auth-signed-out');
const signedInView = document.querySelector('#auth-signed-in');
const accountEmail = document.querySelector('#account-email');
const authForm = document.querySelector('#auth-form');
const emailInput = document.querySelector('#auth-email');
const emailLabel = document.querySelector('#auth-email-label');
const passwordInput = document.querySelector('#auth-password');
const submitButton = document.querySelector('#auth-submit');
const resetButton = document.querySelector('#auth-reset');
const signoutButton = document.querySelector('#auth-signout');
const authMessage = document.querySelector('#auth-message');
const signoutMessage = document.querySelector('#signout-message');
const loginTab = document.querySelector('#login-tab');
const signupTab = document.querySelector('#signup-tab');
let authMode = 'login';

function setMessage(element, message = '', type = '') {
  element.textContent = message;
  element.classList.toggle('is-error', type === 'error');
  element.classList.toggle('is-success', type === 'success');
}

function setLoading(loading, label) {
  submitButton.disabled = loading;
  submitButton.textContent = loading ? '처리 중...' : label;
}

function setAuthMode(mode) {
  authMode = mode;
  const isLogin = mode === 'login';
  const isRecovery = mode === 'recovery';
  document.querySelector('.auth-tabs').hidden = isRecovery;
  emailLabel.hidden = isRecovery;
  emailInput.required = !isRecovery;
  loginTab.classList.toggle('is-active', isLogin);
  signupTab.classList.toggle('is-active', !isLogin);
  loginTab.setAttribute('aria-selected', String(isLogin));
  signupTab.setAttribute('aria-selected', String(!isLogin));
  passwordInput.autocomplete = isLogin ? 'current-password' : 'new-password';
  submitButton.textContent = isRecovery ? '새 비밀번호 저장' : (isLogin ? '로그인' : '회원가입');
  resetButton.hidden = !isLogin || isRecovery;
  if (isRecovery) {
    document.querySelector('#auth-title').textContent = '새 비밀번호 설정';
    document.querySelector('.auth-description').textContent = '앞으로 사용할 새 비밀번호를 입력해 주세요.';
  } else {
    document.querySelector('#auth-title').textContent = 'POSCO에 오신 것을 환영합니다';
    document.querySelector('.auth-description').textContent = '이메일로 로그인하거나 새 계정을 만들어 주세요.';
  }
  setMessage(authMessage);
}

function renderSession(session) {
  const user = session?.user;
  signedOutView.hidden = Boolean(user);
  signedInView.hidden = !user;
  authTrigger.classList.toggle('is-signed-in', Boolean(user));
  authTriggerLabel.textContent = user ? '내 계정' : '로그인';
  accountEmail.textContent = user?.email || '';
}

loginTab?.addEventListener('click', () => setAuthMode('login'));
signupTab?.addEventListener('click', () => setAuthMode('signup'));

authForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    setMessage(authMessage, '로그인 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  setMessage(authMessage);
  const actionLabel = authMode === 'recovery' ? '새 비밀번호 저장' : (authMode === 'login' ? '로그인' : '회원가입');
  setLoading(true, actionLabel);

  try {
    const result = authMode === 'recovery'
      ? await supabaseClient.auth.updateUser({ password })
      : authMode === 'login'
        ? await supabaseClient.auth.signInWithPassword({ email, password })
        : await supabaseClient.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
        });

    if (result.error) throw result.error;

    if (authMode === 'recovery') {
      const { data } = await supabaseClient.auth.getSession();
      setAuthMode('login');
      renderSession(data.session);
      setMessage(signoutMessage, '비밀번호가 안전하게 변경되었습니다.', 'success');
    } else if (authMode === 'signup' && !result.data.session) {
      setMessage(authMessage, '가입 확인 메일을 보냈습니다. 이메일에서 인증을 완료해 주세요.', 'success');
      authForm.reset();
    } else {
      renderSession(result.data.session);
      authForm.reset();
    }
  } catch (error) {
    const fallback = authMode === 'recovery'
      ? '비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.'
      : authMode === 'login'
        ? '이메일 또는 비밀번호를 확인해 주세요.'
        : '회원가입을 완료하지 못했습니다. 입력 내용을 확인해 주세요.';
    setMessage(authMessage, error?.message || fallback, 'error');
  } finally {
    const nextLabel = authMode === 'recovery' ? '새 비밀번호 저장' : (authMode === 'login' ? '로그인' : '회원가입');
    setLoading(false, nextLabel);
  }
});

resetButton?.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  if (!email) {
    setMessage(authMessage, '비밀번호 재설정 메일을 받을 이메일을 입력해 주세요.', 'error');
    emailInput.focus();
    return;
  }

  resetButton.disabled = true;
  setMessage(authMessage, '재설정 메일을 보내는 중입니다...');
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname}`,
  });
  resetButton.disabled = false;
  setMessage(
    authMessage,
    error ? error.message : '비밀번호 재설정 메일을 보냈습니다.',
    error ? 'error' : 'success',
  );
});

signoutButton?.addEventListener('click', async () => {
  signoutButton.disabled = true;
  setMessage(signoutMessage, '로그아웃 중입니다...');
  const { error } = await supabaseClient.auth.signOut();
  signoutButton.disabled = false;
  if (error) setMessage(signoutMessage, error.message, 'error');
  else {
    setMessage(signoutMessage);
    document.querySelector('#auth-dialog')?.close();
  }
});

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => renderSession(data.session));
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      setAuthMode('recovery');
      signedOutView.hidden = false;
      signedInView.hidden = true;
      document.querySelector('#auth-dialog')?.showModal();
      return;
    }
    renderSession(session);
  });
} else {
  authTrigger.disabled = true;
  authTriggerLabel.textContent = '로그인 오류';
}
