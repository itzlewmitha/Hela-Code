<script>
  // -----------------------
  // Toggle between homepage & login
  // -----------------------
  function showLogin() {
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('loginpage').style.display = 'block';
    document.getElementById('loginForm').style.display = '';
    document.getElementById('createAccountForm').style.display = 'none';
  }

  function showCreateAccount() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('createAccountForm').style.display = '';
    document.getElementById('createError').style.display = 'none';
  }

  function hideCreateAccount() {
    document.getElementById('loginForm').style.display = '';
    document.getElementById('createAccountForm').style.display = 'none';
  }

  function showForgotPassword() {
    const email = document.getElementById('email').value.trim();
    if (!email) {
      alert('Please enter your email in the login form first.');
      return;
    }
    firebase.auth().sendPasswordResetEmail(email)
      .then(() => alert('Password reset email sent!'))
      .catch(err => alert(err.message.replace("Firebase:", "")));
  }

  // -----------------------
  // Firebase Config
  // -----------------------
  const firebaseConfig = {
    apiKey: "AIzaSyAkZ1COLT59ukLGzpv5lW3UZ8vQ9tEN1gw",
    authDomain: "hela-code.firebaseapp.com",
    projectId: "hela-code",
    appId: "1:813299203715:web:910e7227cdd4a09ad1a5b6"
  };
  firebase.initializeApp(firebaseConfig);

  // -----------------------
  // Login Logic
  // -----------------------
  document.getElementById('loginForm').addEventListener('submit', async function() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const errorDiv = document.getElementById('loginError');
    errorDiv.style.display = 'none';
    document.getElementById('loginBtn').disabled = true;

    try {
      await firebase.auth().setPersistence(
        rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
      );
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      if (user) {
        localStorage.setItem('helaUser', user.email.split('@')[0]); // store username
      }
      window.location.href = "/chat.html"; // redirect to chat
    } catch (err) {
      errorDiv.textContent = err.message.replace("Firebase:", "");
      errorDiv.style.display = 'block';
    }

    document.getElementById('loginBtn').disabled = false;
  });

  // -----------------------
  // Create Account Logic
  // -----------------------
  document.getElementById('createAccountForm').addEventListener('submit', async function() {
    const email = document.getElementById('newEmail').value.trim();
    const password = document.getElementById('newPassword').value;
    const errorDiv = document.getElementById('createError');
    errorDiv.style.display = 'none';
    document.getElementById('createBtn').disabled = true;

    try {
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      if (user) {
        localStorage.setItem('helaUser', user.email.split('@')[0]);
      }
      window.location.href = "/chat.html";
    } catch (err) {
      errorDiv.textContent = err.message.replace("Firebase:", "");
      errorDiv.style.display = 'block';
    }

    document.getElementById('createBtn').disabled = false;
  });

  // -----------------------
  // Google Login Logic
  // -----------------------
  document.getElementById('googleLoginBtn').addEventListener('click', async function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      if (user) {
        localStorage.setItem('helaUser', user.displayName || user.email.split('@')[0]);
      }
      window.location.href = "/chat.html";
    } catch (err) {
      const errorDiv = document.getElementById('loginError');
      errorDiv.textContent = err.message.replace("Firebase:", "");
      errorDiv.style.display = 'block';
    }
  });

  // -----------------------
  // Auto Redirect if Logged In
  // -----------------------
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      // already logged in, send them to chat
      localStorage.setItem('helaUser', user.displayName || user.email.split('@')[0]);
      window.location.href = "/chat.html";
    }
  });
</script>
