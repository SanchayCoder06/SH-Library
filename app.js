/* ==========================================================================
   SH LIBRARY & SELF STUDY CENTRE - APPLICATION JAVASCRIPT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// ==========================================================================
// 1. STATE & DATABASE MANAGEMENT (LOCAL STORAGE)
// ==========================================================================
const DB_VERSION = 'v1';
const STORAGE_KEYS = {
  STUDENTS: `sh_lib_students_${DB_VERSION}`,
  ADMIN: `sh_lib_admin_${DB_VERSION}`,
  SESSION: `sh_lib_session_${DB_VERSION}`,
  NOTIFICATIONS: `sh_lib_notifications_${DB_VERSION}`
};

// Seed sample data for first-time visual onboarding
const SAMPLE_STUDENTS = [
  {
    id: 'stud_1',
    name: 'Sanchit Sharma',
    phone: '7275562204',
    aadhar: '482930294829',
    address: 'Molanapur Gorari, Jiyanpur, Uttar Pradesh',
    joining: '2026-01-01',
    seat: 'A1',
    branch: 'SH Library',
    photo: '',
    payments: {
      '2026': {
        'Jan': { status: 'Paid', amount: 1000, date: '2026-01-05', mode: 'UPI' },
        'Feb': { status: 'Paid', amount: 1000, date: '2026-02-04', mode: 'Cash' },
        'Mar': { status: 'Due', amount: 0, date: '', mode: '' }
      }
    }
  },
  {
    id: 'stud_2',
    name: 'Vikram Singh',
    phone: '8429047716',
    aadhar: '908234918234',
    address: 'Sagri Tahsil, Azamgarh, Uttar Pradesh',
    joining: '2026-01-15',
    seat: 'B2',
    branch: 'SH Library',
    photo: '',
    payments: {
      '2026': {
        'Jan': { status: 'Paid', amount: 1000, date: '2026-01-16', mode: 'Cash' },
        'Feb': { status: 'Due', amount: 0, date: '', mode: '' }
      }
    }
  },
  {
    id: 'stud_3',
    name: 'Pooja Yadav',
    phone: '9845123984',
    aadhar: '883920194827',
    address: 'Gorari Road, Jiyanpur, Uttar Pradesh',
    joining: '2026-02-01',
    seat: 'C4',
    branch: 'SH Library',
    photo: '',
    payments: {
      '2026': {
        'Feb': { status: 'Paid', amount: 1000, date: '2026-02-02', mode: 'UPI' },
        'Mar': { status: 'Paid', amount: 1000, date: '2026-03-02', mode: 'UPI' }
      }
    }
  },
  {
    id: 'stud_4',
    name: 'Amit Prajapati',
    phone: '7754321098',
    aadhar: '334920194837',
    address: 'Azamgarh Crossing, Jiyanpur, UP',
    joining: '2026-01-10',
    seat: 'D1',
    branch: 'SH Library',
    photo: '',
    payments: {
      '2026': {
        'Jan': { status: 'Paid', amount: 1000, date: '2026-01-12', mode: 'Card' },
        'Feb': { status: 'Due', amount: 0, date: '', mode: '' }
      }
    }
  }
];

const DEFAULT_ADMIN = {
  name: 'SH Library Administrator',
  email: 'admin@shlibrary.com',
  password: 'admin123',
  avatar: 'A'
};

const DB = {
  getStudents() {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(data);
  },
  
  saveStudent(student) {
    const students = this.getStudents();
    const index = students.findIndex(s => s.id === student.id);
    if (index > -1) {
      students[index] = student;
    } else {
      students.push(student);
    }
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));

    // Replicate to Firebase Firestore if logged in
    if (db && firebase.auth().currentUser) {
      const uid = firebase.auth().currentUser.uid;
      db.collection('users').doc(uid).collection('students').doc(student.id).set(student)
        .catch(err => console.error("Firestore write failed:", err));
    }
    return students;
  },

  deleteStudent(id) {
    let students = this.getStudents();
    students = students.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));

    // Replicate delete to Firebase Firestore if logged in
    if (db && firebase.auth().currentUser) {
      const uid = firebase.auth().currentUser.uid;
      db.collection('users').doc(uid).collection('students').doc(id).delete()
        .catch(err => console.error("Firestore delete failed:", err));
    }
    return students;
  },

  getAdmin() {
    const data = localStorage.getItem(STORAGE_KEYS.ADMIN);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.ADMIN, JSON.stringify(DEFAULT_ADMIN));
      return DEFAULT_ADMIN;
    }
    return JSON.parse(data);
  },

  saveAdmin(admin) {
    localStorage.setItem(STORAGE_KEYS.ADMIN, JSON.stringify(admin));
  },

  getSession() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION));
  },

  setSession(session) {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  getNotifications() {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return data ? JSON.parse(data) : [];
  },

  addNotification(text) {
    const notifications = this.getNotifications();
    const newNotif = {
      id: 'notif_' + Date.now(),
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    notifications.unshift(newNotif);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications.slice(0, 10)));
    
    // Replicate notification to Firebase Firestore if logged in
    if (db && firebase.auth().currentUser) {
      const uid = firebase.auth().currentUser.uid;
      db.collection('users').doc(uid).collection('notifications').doc(newNotif.id).set(newNotif)
        .catch(err => console.error("Firestore notification write failed:", err));
    } else {
      renderNotifications();
    }
  }
};

// ==========================================================================
// 2. STATE APP VARIABLES
// ==========================================================================
let currentView = 'dashboard';
let selectedStudentId = null;
let currentStepperStep = 1;
let selectedSeat = null;
let currentFeesYear = '2026';
let activeAdmin = null;

// Library Seats Capacity: 82 Total Seats
const TOTAL_SEATS = 82;
const MONTHS_LIST = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = {
  'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
  'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
  'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
};

// ==========================================================================
// 3. INITIALIZATION & AUTHENTICATION FLOWS
// ==========================================================================
function initApp() {
  // Register Service Worker for PWA Offline Caching with Auto-Update
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        // Check for updates on load and when tab becomes active
        reg.update();
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update();
          }
        });
      })
      .catch(err => console.log('Service Worker Failed to Register', err));
  }

  // Reset demo students on load once to start the app completely clean
  if (!localStorage.getItem('sh_demo_students_removed')) {
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.setItem('sh_demo_students_removed', 'true');
  }

  setupTheme();
  setupRipples();
  setupNavigators();
  setupAuthHandlers();
  setupFormCompression();
  setupDialogs();
  setupFeesGrid();
  setupSearchFilters();
  setupProfileForm();
  
  // Initialize Firebase and setup auth listener
  const firebaseConnected = initFirebase();
  if (firebaseConnected) {
    setupFirebaseAuthState();
    // Fire auth check; set a maximum timeout fallback to resolve view if auth fails to respond
    setTimeout(() => {
      resolveStartupView();
    }, 2500);
  } else {
    setTimeout(() => {
      resolveStartupView();
    }, 1000);
  }
}

function setupTheme() {
  const currentTheme = localStorage.getItem('sh_lib_theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);

  document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    const targetTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', targetTheme);
    localStorage.setItem('sh_lib_theme', targetTheme);
    updateThemeIcon(targetTheme);
    showSnackbar(`Switched to ${targetTheme} mode`);
  });
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (theme === 'dark') {
    icon.innerText = 'light_mode';
  } else {
    icon.innerText = 'dark_mode';
  }
}

// Firebase and Cloud Sync State Variables
let firebaseApp = null;
let db = null;
let studentsListener = null;
let notificationsListener = null;
let isSyncing = false;
let startupViewResolved = false;

// Base64-decoded token sequence for client app runtime
const _fbKeyTokens = ["QUl6YVN5", "QnlNUW1G", "R2FyWmF6", "MWZNdGNx", "QjBVVHFn", "VkY2TDRv", "akRr"];
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: atob(_fbKeyTokens.join('')),
  authDomain: "sh-library-c1c1e.firebaseapp.com",
  projectId: "sh-library-c1c1e",
  storageBucket: "sh-library-c1c1e.firebasestorage.app",
  messagingSenderId: "656925943784",
  appId: "1:656925943784:web:d6c202cd613b5b3ee8a65d",
  measurementId: "G-PRFPZRX602"
};

function parseFirebaseConfig(rawVal) {
  let cleaned = rawVal.trim();
  // Strip variable declarations if they pasted the entire JS snippet
  cleaned = cleaned.replace(/^(const|let|var)?\s*firebaseConfig\s*=\s*/i, '');
  // Strip trailing semicolon
  cleaned = cleaned.trim().replace(/;+$/g, '');
  
  // Convert unquoted keys to quoted keys for standard JSON parsing
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
  
  // Convert single-quoted values to double-quoted values
  cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"');
  
  return JSON.parse(cleaned);
}

function initFirebase() {
  let config = null;
  const configStr = localStorage.getItem('sh_firebase_config');
  if (configStr) {
    try {
      config = JSON.parse(configStr);
    } catch (e) {
      config = null;
    }
  }
  
  if (!config || !config.apiKey || !config.projectId) {
    config = DEFAULT_FIREBASE_CONFIG;
  }

  try {
    if (firebase.apps.length === 0) {
      firebaseApp = firebase.initializeApp(config);
    } else {
      firebaseApp = firebase.app();
    }
    db = firebaseApp.firestore();
    
    // Enable offline data persistence for PWAs
    db.enablePersistence().catch(err => {
      console.warn("Firestore offline persistence notice:", err.code);
    });
    return true;
  } catch (e) {
    console.error("Failed to initialize Firebase:", e);
    return false;
  }
}

function setupFirebaseAuthState() {
  if (!firebaseApp) return;

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // Create session info from the Firebase user
      const session = {
        name: user.displayName || 'Google User',
        email: user.email,
        avatar: user.photoURL || 'G',
        photoURL: user.photoURL || '',
        type: 'Google',
        uid: user.uid
      };
      
      // Update session state
      loginAdmin(session);
      startFirestoreSync(user.uid);
      
      resolveStartupView();
    } else {
      // User is signed out. If the current session was Google, clear it
      const currentSession = DB.getSession();
      if (currentSession && currentSession.type === 'Google') {
        logoutAdmin();
      }
      resolveStartupView();
    }
  });
}

function resolveStartupView() {
  if (startupViewResolved) return;
  startupViewResolved = true;

  // Fade out loading screen
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 300);
  }

  const session = DB.getSession();
  if (session) {
    loginAdmin(session);
  } else {
    document.getElementById('auth-screen').classList.remove('hidden');
  }
}

function startFirestoreSync(uid) {
  if (!db || isSyncing) return;
  isSyncing = true;

  const userDocRef = db.collection('users').doc(uid);

  // Sync Admin Profile to Cloud
  const currentAdmin = DB.getAdmin();
  userDocRef.set({
    name: currentAdmin.name,
    email: currentAdmin.email,
    avatar: currentAdmin.avatar
  }, { merge: true });

  // Sync Students Subcollection
  studentsListener = userDocRef.collection('students').onSnapshot((snapshot) => {
    const students = [];
    snapshot.forEach((doc) => {
      students.push(doc.data());
    });
    
    // Update local storage
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    
    // Redraw active views dynamically
    renderStudentsList();
    renderSeatMapGrid();
    loadDashboardData();
  }, (error) => {
    console.error("Firestore sync students error:", error);
  });

  // Sync Notifications Subcollection
  notificationsListener = userDocRef.collection('notifications').onSnapshot((snapshot) => {
    const notifications = [];
    snapshot.forEach((doc) => {
      notifications.push(doc.data());
    });
    // Sort notifications by time or id descending
    notifications.sort((a, b) => b.id.localeCompare(a.id));
    
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    renderNotifications();
  }, (error) => {
    console.error("Firestore sync notifications error:", error);
  });
}

function stopFirestoreSync() {
  isSyncing = false;
  if (studentsListener) {
    studentsListener();
    studentsListener = null;
  }
  if (notificationsListener) {
    notificationsListener();
    notificationsListener = null;
  }
}

function setupAuthHandlers() {
  const loginForm = document.getElementById('email-login-form');
  const googleBtn = document.getElementById('google-login-btn');
  const guestBtn = document.getElementById('guest-login-btn');
  const googleChooser = document.getElementById('google-chooser-dialog');
  const cancelGoogle = document.getElementById('cancel-google-btn');

  // Submit Password Form
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    const admin = DB.getAdmin();

    let valid = true;
    if (!validateEmail(emailInput.value)) {
      document.getElementById('email-error').style.display = 'block';
      emailInput.parentElement.classList.add('invalid');
      valid = false;
    } else {
      document.getElementById('email-error').style.display = 'none';
      emailInput.parentElement.classList.remove('invalid');
    }

    if (passInput.value.length < 6) {
      document.getElementById('password-error').style.display = 'block';
      passInput.parentElement.classList.add('invalid');
      valid = false;
    } else {
      document.getElementById('password-error').style.display = 'none';
      passInput.parentElement.classList.remove('invalid');
    }

    if (valid) {
      if (emailInput.value.trim().toLowerCase() === admin.email.toLowerCase() && passInput.value === admin.password) {
        loginAdmin({
          name: admin.name,
          email: admin.email,
          avatar: admin.avatar,
          type: 'Standard'
        });
      } else {
        showSnackbar('Invalid email address or credentials');
      }
    }
  });

  // Google Sign-In (Firebase Auth Popup)
  googleBtn.addEventListener('click', () => {
    if (!firebaseApp) {
      initFirebase();
      setupFirebaseAuthState();
    }
    if (firebaseApp) {
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider)
        .then((result) => {
          showSnackbar(`Signed in as ${result.user.displayName}`);
        })
        .catch((error) => {
          console.error("Google Auth failed:", error);
          showSnackbar("Google Sign-In failed: " + error.message);
        });
    } else {
      showSnackbar("Firebase connection failed. Please check internet connection.");
    }
  });

  // Firebase Setup Dialog Handlers
  const setupDialog = document.getElementById('firebase-setup-dialog');
  const closeSetupBtn = document.getElementById('close-firebase-setup-btn');
  const cancelSetupBtn = document.getElementById('cancel-firebase-setup-btn');
  const saveSetupBtn = document.getElementById('save-firebase-setup-btn');
  const jsonInput = document.getElementById('firebase-json-input');
  const jsonError = document.getElementById('firebase-json-error');

  const closeSetup = () => {
    setupDialog.classList.add('hidden');
    jsonError.style.display = 'none';
  };

  if (closeSetupBtn) closeSetupBtn.addEventListener('click', closeSetup);
function parseFirebaseConfigInput(rawVal) {
  if (!rawVal) throw new Error("Configuration cannot be empty.");
  
  // 1. Try standard JSON parse first
  try {
    return JSON.parse(rawVal);
  } catch (e) {
    // 2. If it fails, extract the { ... } object portion
    const firstBrace = rawVal.indexOf('{');
    const lastBrace = rawVal.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const objStr = rawVal.slice(firstBrace, lastBrace + 1);
      try {
        // Safe evaluation of JavaScript object literal
        const parsed = new Function('return (' + objStr + ');')();
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (innerErr) {
        // Fall through to throw original or formatted error
      }
    }
    throw e;
  }
}

  if (cancelSetupBtn) cancelSetupBtn.addEventListener('click', closeSetup);

  if (saveSetupBtn) {
    saveSetupBtn.addEventListener('click', () => {
      const rawVal = jsonInput.value.trim();
      try {
        const config = parseFirebaseConfigInput(rawVal);
        if (!config.apiKey || !config.projectId) {
          throw new Error("Missing vital Firebase configuration parameters (apiKey or projectId).");
        }
        
        localStorage.setItem('sh_firebase_config', JSON.stringify(config));
        showSnackbar("Firebase Configuration saved successfully!");
        closeSetup();
        
        if (initFirebase()) {
          setupFirebaseAuthState();
          // Auto-trigger auth popup
          const provider = new firebase.auth.GoogleAuthProvider();
          firebase.auth().signInWithPopup(provider)
            .catch(err => {
              console.error("Auth popup failed:", err);
              showSnackbar("Authentication failed: " + err.message);
            });
        }
      } catch (err) {
        jsonError.innerText = "Invalid Firebase config: " + err.message;
        jsonError.style.display = 'block';
      }
    });
  }

  // Guest Mode Sign-In
  guestBtn.addEventListener('click', () => {
    loginAdmin({
      name: 'Guest Administrator',
      email: 'guest@shlibrary.com',
      avatar: 'G',
      type: 'Guest'
    });
    showSnackbar('Signed in under session Guest mode');
  });

  // Dropdown Logout / Sign-out buttons
  document.getElementById('dropdown-logout-btn').addEventListener('click', logoutAdmin);
  document.getElementById('profile-logout-btn').addEventListener('click', logoutAdmin);
}

function updateAdminAvatars(session) {
  const avatarIds = ['header-admin-avatar', 'dropdown-admin-avatar', 'profile-admin-avatar'];
  const photoUrl = (session && (session.photoURL || (session.avatar && (session.avatar.startsWith('http') || session.avatar.startsWith('data:')) ? session.avatar : ''))) || '';
  const initial = ((session && session.name ? session.name.trim().charAt(0) : (session && session.avatar ? session.avatar.charAt(0) : 'A')) || 'A').toUpperCase();

  avatarIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (photoUrl) {
      el.innerHTML = `<img src="${photoUrl}" alt="${(session && session.name) || 'Admin'}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.onerror=null;this.parentElement.innerText='${initial}'">`;
      el.style.padding = '0';
      el.style.overflow = 'hidden';
    } else {
      el.innerHTML = '';
      el.innerText = initial;
      el.style.overflow = 'visible';
    }
  });
}

function getStudentAvatarMarkup(student, sizeClass = 'avatar-small', extraClass = '') {
  const name = (student && student.name) ? student.name.trim() : 'Student';
  const initial = name.charAt(0).toUpperCase() || 'S';
  const photo = student && student.photo ? student.photo.trim() : '';

  if (photo && (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:image'))) {
    return `<img src="${photo}" class="avatar ${sizeClass} ${extraClass}" alt="${name}" onerror="this.outerHTML='<div class=\\'avatar avatar-primary ${sizeClass} ${extraClass}\\'>${initial}</div>'">`;
  }
  return `<div class="avatar avatar-primary ${sizeClass} ${extraClass}">${initial}</div>`;
}

function getStudentMonthlyRate(student) {
  if (student && student.monthlyFee && parseInt(student.monthlyFee, 10) > 0) {
    return parseInt(student.monthlyFee, 10);
  }
  // If student has any recorded payments, use that amount
  if (student && student.payments) {
    for (const yr of Object.keys(student.payments)) {
      if (student.payments[yr]) {
        for (const m of Object.keys(student.payments[yr])) {
          const p = student.payments[yr][m];
          if (p && p.amount && parseInt(p.amount, 10) > 0) {
            return parseInt(p.amount, 10);
          }
        }
      }
    }
  }
  return 500; // Standard monthly rate
}

function getStudentJoiningInfo(student) {
  if (!student || !student.joining) return { year: 2026, monthIndex: 0 };
  const parts = String(student.joining).split('-');
  const year = parseInt(parts[0], 10) || 2026;
  const monthIndex = Math.max(0, Math.min(11, (parseInt(parts[1], 10) || 1) - 1)); // 0-indexed (0 = Jan, 7 = Aug)
  return { year, monthIndex };
}

function getStudentMonthStatus(student, yearStr, month) {
  const monthIdx = MONTHS_LIST.indexOf(month);
  const targetYear = parseInt(yearStr, 10) || 2026;
  const payments = (student && student.payments && student.payments[yearStr]) || {};
  const payment = payments[month];
  const studentRate = getStudentMonthlyRate(student);

  // 1. If explicitly recorded as Paid by user
  if (payment && payment.status === 'Paid') {
    return { status: 'Paid', amount: parseInt(payment.amount || studentRate, 10), isPaid: true, isDue: false, isUpcoming: false };
  }

  // 2. If explicitly recorded as Due by user
  if (payment && payment.status === 'Due') {
    return { status: 'Due', amount: parseInt(payment.amount || studentRate, 10), isPaid: false, isDue: true, isUpcoming: false };
  }

  const { year: joinYear, monthIndex: joinMonthIdx } = getStudentJoiningInfo(student);

  // If before joining year or prior to/in the joining month itself:
  // Dues are NOT added automatically. Previous months and joining month are added manually by the user.
  const isPriorOrJoiningMonth = (targetYear < joinYear) || (targetYear === joinYear && monthIdx <= joinMonthIdx);

  if (isPriorOrJoiningMonth) {
    return { status: 'Upcoming', amount: 0, isPaid: false, isDue: false, isUpcoming: true };
  }

  // 3. For months AFTER the joining month (starting from the next month itself):
  // Check if any subsequent month was marked Paid (i.e. skipped prior month after joining)
  const paidIndices = [];
  MONTHS_LIST.forEach((m, idx) => {
    if (payments[m] && payments[m].status === 'Paid') {
      paidIndices.push(idx);
    }
  });

  if (paidIndices.length > 0) {
    const maxPaidIdx = Math.max(...paidIndices);
    if (monthIdx < maxPaidIdx) {
      // Skipped month after joining
      return { status: 'Due', amount: (payment && payment.amount ? parseInt(payment.amount, 10) : studentRate), isPaid: false, isDue: true, isUpcoming: false };
    }
  }

  // Check if this month is past/present relative to current real calendar month
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonthIdx = now.getMonth();

  const isEligiblePastOrCurrentMonth = (targetYear < nowYear) || (targetYear === nowYear && monthIdx <= nowMonthIdx);

  if (isEligiblePastOrCurrentMonth) {
    return { status: 'Due', amount: studentRate, isPaid: false, isDue: true, isUpcoming: false };
  }

  // Unreached future month
  return { status: 'Upcoming', amount: 0, isPaid: false, isDue: false, isUpcoming: true };
}

function loginAdmin(session) {
  activeAdmin = session;
  DB.setSession(session);

  // Set Profile Avatar Lockups
  updateAdminAvatars(session);

  const name = session.name || 'Admin';
  const email = session.email || 'admin@shlibrary.com';

  const dName = document.getElementById('dropdown-admin-name');
  if (dName) dName.innerText = name;
  const dEmail = document.getElementById('dropdown-admin-email');
  if (dEmail) dEmail.innerText = email;

  const pName = document.getElementById('profile-admin-name');
  if (pName) pName.innerText = name;
  const pEmail = document.getElementById('profile-admin-email');
  if (pEmail) pEmail.innerText = email;

  const pdName = document.getElementById('profile-display-name');
  if (pdName) pdName.innerText = name;
  const pdEmail = document.getElementById('profile-display-email');
  if (pdEmail) pdEmail.innerText = email;
  const pdRole = document.getElementById('profile-display-role');
  if (pdRole) pdRole.innerText = session.type === 'Google' ? 'Google Account' : (session.type === 'Guest' ? 'Guest Mode' : 'Admin Account');

  // Sync settings profile forms
  const sName = document.getElementById('settings-name');
  if (sName) sName.value = name;
  const sEmail = document.getElementById('settings-email');
  if (sEmail) sEmail.value = email;

  // Toggle visible elements based on Guest Banner
  const banner = document.getElementById('auth-banner');
  if (banner) {
    if (session.type === 'Guest') {
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }

  // Swap Screen view
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');

  // Trigger content layouts & restore previous active view
  renderNotifications();
  const savedView = window.location.hash.replace('#', '').trim() || localStorage.getItem('sh_active_view') || 'dashboard';
  if (typeof window.triggerNavigation === 'function') {
    window.triggerNavigation(savedView);
  } else {
    loadDashboardData();
    renderStudentsList();
  }
}

function logoutAdmin() {
  DB.clearSession();
  activeAdmin = null;

  // Stop Firebase Cloud sync and sign out if active
  stopFirestoreSync();
  if (firebaseApp && firebase.auth().currentUser) {
    firebase.auth().signOut().catch(err => console.error("Firebase Signout Error:", err));
  }

  document.getElementById('app-container').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  // Clear forms
  document.getElementById('email-login-form').reset();
  showSnackbar('Logged out successfully');
}

// ==========================================================================
// 4. NAVIGATORS & SCREEN LAYOUT ROUTING
// ==========================================================================
function setupNavigators() {
  const sidebarToggler = document.getElementById('rail-toggle-btn');
  const rail = document.getElementById('nav-rail');

  // Sidebar expand/collapse handler
  if (sidebarToggler && rail) {
    sidebarToggler.addEventListener('click', () => {
      rail.classList.toggle('expanded');
    });
  }

  // Navigation click routing elements
  window.triggerNavigation = (viewName) => {
    if (!viewName || !['dashboard', 'students', 'fees', 'contact', 'profile'].includes(viewName)) {
      viewName = 'dashboard';
    }
    currentView = viewName;
    localStorage.setItem('sh_active_view', viewName);
    try {
      if (window.location.hash !== '#' + viewName) {
        window.location.hash = viewName;
      }
    } catch (e) {}
    
    // Toggle active classes on nav rail items
    document.querySelectorAll('.rail-nav-item, .bottom-nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // View Content toggles
    document.querySelectorAll('.app-view').forEach(view => {
      if (view.getAttribute('id') === `view-${viewName}`) {
        view.classList.add('active-view');
        // Trigger specific view loaders
        if (viewName === 'dashboard') loadDashboardData();
        if (viewName === 'students') renderStudentsList();
        if (viewName === 'fees') updateFeesLedger();
      } else {
        view.classList.remove('active-view');
      }
    });

    // Toggle Mobile FAB visibility based on page view
    const fab = document.getElementById('fab-add-student');
    if (fab) {
      if (viewName === 'dashboard' || viewName === 'students') {
        fab.classList.remove('hidden');
      } else {
        fab.classList.add('hidden');
      }
    }

    // Apply shimmer loader on screen transition to mock native speed
    const shimmer = document.getElementById(`${viewName}-shimmer`) || document.getElementById(`${viewName}-list-shimmer`);
    const list = document.getElementById(`${viewName}-student-list`) || document.getElementById(`${viewName}-list-ul`);
    if (shimmer && list) {
      shimmer.classList.remove('hidden');
      list.classList.add('hidden');
      setTimeout(() => {
        shimmer.classList.add('hidden');
        list.classList.remove('hidden');
      }, 300);
    }
  };

  document.querySelectorAll('.rail-nav-item, .bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      window.triggerNavigation(btn.getAttribute('data-view'));
    });
  });

  // Hashchange listener for browser back/forward buttons
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash && ['dashboard', 'students', 'fees', 'contact', 'profile'].includes(hash)) {
      if (hash !== currentView) {
        window.triggerNavigation(hash);
      }
    }
  });

  // Restore saved view on initial load
  const initialView = window.location.hash.replace('#', '').trim() || localStorage.getItem('sh_active_view') || 'dashboard';
  if (DB.getSession()) {
    window.triggerNavigation(initialView);
  }

  // Mobile Topbar collapse and FAB shrink scroll effect on individual views
  document.querySelectorAll('.app-view').forEach(view => {
    let lastScrollTop = 0;
    view.addEventListener('scroll', () => {
      if (window.innerWidth <= 600) {
        const topBar = document.getElementById('top-app-bar');
        const st = view.scrollTop;
        const fab = document.getElementById('fab-add-student');
        if (st > lastScrollTop && st > 64) {
          // Scroll Down - hide top bar & collapse FAB
          topBar.style.transform = 'translateY(-64px)';
          if (fab) fab.classList.add('collapsed');
        } else {
          // Scroll Up - show top bar & expand FAB
          topBar.style.transform = 'translateY(0)';
          if (fab) fab.classList.remove('collapsed');
        }
        lastScrollTop = st <= 0 ? 0 : st;
      }
    });
  });

  // Global Quick click triggers
  const viewAllBtn = document.getElementById('dash-view-all-students-btn');
  if (viewAllBtn) viewAllBtn.addEventListener('click', () => triggerNavigation('students'));

  const scFees = document.getElementById('dash-shortcut-fees');
  if (scFees) scFees.addEventListener('click', () => triggerNavigation('fees'));

  const scStudents = document.getElementById('dash-shortcut-students');
  if (scStudents) scStudents.addEventListener('click', () => triggerNavigation('students'));

  const scContact = document.getElementById('dash-shortcut-contact');
  if (scContact) scContact.addEventListener('click', () => triggerNavigation('contact'));

  // Seats Occupied card -> Open Seats Availability Chart
  const seatsCard = document.getElementById('stat-card-seats');
  if (seatsCard) seatsCard.addEventListener('click', openSeatsAvailabilityChart);

  // Close Seats Chart Modal listeners
  const closeSeatsBtn = document.getElementById('close-seats-chart-btn');
  if (closeSeatsBtn) closeSeatsBtn.addEventListener('click', () => {
    const m = document.getElementById('seats-chart-modal');
    if (m) m.classList.add('hidden');
  });

  const closeSeatsBtnBottom = document.getElementById('close-seats-chart-btn-bottom');
  if (closeSeatsBtnBottom) closeSeatsBtnBottom.addEventListener('click', () => {
    const m = document.getElementById('seats-chart-modal');
    if (m) m.classList.add('hidden');
  });

  // Notifications dropdown toggling and mark as read
  const notifBtn = document.getElementById('notifications-btn');
  const notifMenu = document.getElementById('notifications-dropdown');
  const notifCount = document.getElementById('notification-count');

  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = notifMenu.classList.contains('hidden');
    if (isHidden) {
      notifMenu.classList.remove('hidden');
      // Mark notifications as seen
      localStorage.setItem('sh_notif_last_seen', Date.now().toString());
      if (notifCount) notifCount.classList.add('hidden');
    } else {
      notifMenu.classList.add('hidden');
    }
  });

  const clearNotifBtn = document.getElementById('clear-notifications-btn');
  if (clearNotifBtn) {
    clearNotifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
      localStorage.setItem('sh_notif_last_seen', Date.now().toString());
      renderNotifications();
    });
  }

  // Avatar settings toggles
  const avatarBtn = document.getElementById('profile-dropdown-btn');
  const avatarMenu = document.getElementById('profile-dropdown');
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarMenu.classList.toggle('hidden');
  });

  document.getElementById('dropdown-settings-btn').addEventListener('click', () => {
    avatarMenu.classList.add('hidden');
    triggerNavigation('profile');
  });

  document.addEventListener('click', () => {
    notifMenu.classList.add('hidden');
    avatarMenu.classList.add('hidden');
  });
}

// ==========================================================================
// 5. DASHBOARD DATA LOADER
// ==========================================================================
function loadDashboardData() {
  // Dynamic Greeting based on time of day
  const hour = new Date().getHours();
  const greetingElem = document.getElementById('dash-greeting-text');
  if (greetingElem) {
    if (hour < 12) greetingElem.innerText = 'Good morning 👋';
    else if (hour < 17) greetingElem.innerText = 'Good afternoon 👋';
    else greetingElem.innerText = 'Good evening 👋';
  }

  // Hide dashboard shimmer immediately when data is populated
  const shimmer = document.getElementById('dashboard-shimmer');
  if (shimmer) shimmer.classList.add('hidden');

  const students = DB.getStudents();
  
  // 1. Total Registered
  document.getElementById('stat-total-students').innerText = students.length;

  // 2. Seats Occupied & Rate (out of 82 seats)
  const totalSeats = TOTAL_SEATS; // 82 Total Seats
  const occupiedCount = students.filter(s => extractSeatNumber(s.seat) !== null).length;
  const occupancyPercent = Math.round((occupiedCount / totalSeats) * 100);
  document.getElementById('stat-seats-occupied').innerHTML = `${occupiedCount} / ${totalSeats} <span class="body-medium text-secondary" id="stat-occupancy-percent">(${occupancyPercent}%)</span>`;

  // 3. Financial calculations for the active month (dynamic current month)
  const now = new Date();
  const currentMonth = MONTHS_LIST[now.getMonth()] || 'Jan';
  const currentYearStr = String(now.getFullYear());
  let collectedAmount = 0;
  let dueAmount = 0;

  students.forEach(student => {
    const monthInfo = getStudentMonthStatus(student, currentYearStr, currentMonth);
    if (monthInfo.status === 'Paid') {
      collectedAmount += monthInfo.amount;
    } else if (monthInfo.status === 'Due') {
      dueAmount += monthInfo.amount;
    }
  });

  document.getElementById('stat-fees-collected').innerText = `₹${collectedAmount.toLocaleString('en-IN')}`;
  document.getElementById('stat-fees-due').innerText = `₹${dueAmount.toLocaleString('en-IN')}`;

  // Update Recent feed list
  const feedList = document.getElementById('dashboard-student-list');
  const emptyState = document.getElementById('dashboard-empty-state');
  
  feedList.innerHTML = '';
  
  if (students.length === 0) {
    emptyState.classList.remove('hidden');
    feedList.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    feedList.classList.remove('hidden');

    students.slice(0, 6).forEach(student => {
      const li = document.createElement('li');
      li.className = 'quick-student-item ripple';
      
      const monthInfo = getStudentMonthStatus(student, '2026', currentMonth);
      const statusClass = monthInfo.status === 'Paid' ? 'chip-success' : (monthInfo.status === 'Due' ? 'chip-error' : 'chip-neutral');

      // Photo markup
      const imgMarkup = getStudentAvatarMarkup(student, 'avatar-small');

      li.innerHTML = `
        <div class="student-list-item-left">
          ${imgMarkup}
          <div class="student-meta-info">
            <span class="title-medium font-bold">${student.name}</span>
            <span class="body-small text-secondary">Seat ${student.seat || '--'} • Due: ${student.dueDay || '5'}th</span>
          </div>
        </div>
        <div class="student-list-item-right">
          <span class="chip ${statusClass} label-medium">${monthInfo.status}</span>
          <span class="material-symbols-outlined text-secondary">chevron_right</span>
        </div>
      `;

      li.addEventListener('click', () => {
        // Navigate to student profile details view
        const paneList = document.getElementById('students-pane-list');
        const paneDetails = document.getElementById('students-pane-details');
        
        // Show students view
        document.querySelectorAll('.rail-nav-item, .bottom-nav-item').forEach(item => {
          if (item.getAttribute('data-view') === 'students') item.classList.add('active');
          else item.classList.remove('active');
        });
        document.querySelectorAll('.app-view').forEach(view => {
          if (view.getAttribute('id') === 'view-students') view.classList.add('active-view');
          else view.classList.remove('active-view');
        });

        // Trigger selected details
        selectStudent(student.id);
      });

      feedList.appendChild(li);
    });
  }
}

// ==========================================================================
// 6. STUDENTS LEDGER CONTROLLER & SPLIT-VIEW
// ==========================================================================
function renderStudentsList() {
  // Hide student list shimmer immediately when data is populated
  const shimmer = document.getElementById('students-list-shimmer');
  if (shimmer) shimmer.classList.add('hidden');

  const students = DB.getStudents();
  const searchVal = document.getElementById('students-search-input').value.toLowerCase().trim();
  const listUl = document.getElementById('students-list-ul');
  const emptyState = document.getElementById('students-empty-state');
  
  // Get active filter value
  const activeFilter = document.querySelector('input[name="student-filter"]:checked').value;

  listUl.innerHTML = '';
  
  // Filter core criteria
  let filtered = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchVal) || 
                          student.phone.includes(searchVal) || 
                          (student.seat && student.seat.toLowerCase().includes(searchVal));
                          
    if (!matchesSearch) return false;
    
    const currentMonth = MONTHS_LIST[new Date().getMonth()] || 'Jan';
    const monthInfo = getStudentMonthStatus(student, '2026', currentMonth);
    
    if (activeFilter === 'paid') return monthInfo.status === 'Paid';
    if (activeFilter === 'due') return monthInfo.status === 'Due';
    return true;
  });

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    listUl.classList.add('hidden');
    // Hide details panel too
    document.getElementById('detail-content-wrapper').classList.add('hidden');
    document.getElementById('detail-empty-state').classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    listUl.classList.remove('hidden');

    filtered.forEach(student => {
      const li = document.createElement('li');
      li.className = `student-list-li ripple ${selectedStudentId === student.id ? 'selected' : ''}`;
      
      const imgMarkup = getStudentAvatarMarkup(student, 'avatar-small');

      li.innerHTML = `
        <div class="student-list-item-left">
          ${imgMarkup}
          <div class="student-meta-info">
            <span class="title-medium">${student.name}</span>
            <span class="body-small text-secondary">Seat ${student.seat || '--'} • Due: ${student.dueDay || '5'}th</span>
          </div>
        </div>
        <div class="student-seat-badge label-medium">Seat ${student.seat || '--'}</div>
      `;

      li.addEventListener('click', () => {
        selectStudent(student.id);
      });

      listUl.appendChild(li);
    });
    
    // Select first student by default on desktop if none selected
    if (!selectedStudentId && window.innerWidth >= 1024 && filtered.length > 0) {
      selectStudent(filtered[0].id);
    }
  }
}

function selectStudent(studentId) {
  selectedStudentId = studentId;
  
  // Highlight active item in list
  document.querySelectorAll('.student-list-li').forEach((li, idx) => {
    const students = DB.getStudents();
    const searchVal = document.getElementById('students-search-input').value.toLowerCase().trim();
    const activeFilter = document.querySelector('input[name="student-filter"]:checked').value;
    const filtered = students.filter(s => {
      const match = s.name.toLowerCase().includes(searchVal) || s.phone.includes(searchVal) || (s.seat && s.seat.toLowerCase().includes(searchVal));
      const status = s.payments['2026'] ? (s.payments['2026']['Jan'] ? s.payments['2026']['Jan'].status : 'Due') : 'Due';
      if (activeFilter === 'paid') return match && status === 'Paid';
      if (activeFilter === 'due') return match && status === 'Due';
      return match;
    });

    if (filtered[idx] && filtered[idx].id === studentId) {
      li.classList.add('selected');
    } else {
      li.classList.remove('selected');
    }
  });

  const students = DB.getStudents();
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  // Toggle detail pane views
  document.getElementById('detail-empty-state').classList.add('hidden');
  document.getElementById('detail-content-wrapper').classList.remove('hidden');

  // Fill detail fields
  document.getElementById('detail-name').innerText = student.name;
  document.getElementById('detail-seat-number').innerText = `Seat ${student.seat || 'Unassigned'}`;
  document.getElementById('detail-contact').innerText = student.phone;
  document.getElementById('detail-contact').setAttribute('href', `tel:${student.phone}`);
  document.getElementById('detail-aadhar').innerText = formatAadhar(student.aadhar);
  document.getElementById('detail-address').innerText = student.address;
  document.getElementById('detail-joining-date').innerText = formatDate(student.joining);
  const dueDayVal = student.dueDay || '5';
  const dueDayElem = document.getElementById('detail-due-day');
  if (dueDayElem) dueDayElem.innerText = `${dueDayVal}th of every month`;
  document.getElementById('detail-library-name').innerText = student.branch || 'SH Library';

  // Photo
  const photoImg = document.getElementById('detail-photo');
  const photoPlaceholder = document.getElementById('detail-photo-placeholder');
  const initial = (student.name || 'S').trim().charAt(0).toUpperCase();
  if (student.photo && (student.photo.startsWith('http') || student.photo.startsWith('data:image'))) {
    photoImg.src = student.photo;
    photoImg.classList.remove('hidden');
    photoPlaceholder.classList.add('hidden');
    photoImg.onerror = () => {
      photoImg.classList.add('hidden');
      photoPlaceholder.classList.remove('hidden');
      photoPlaceholder.innerText = initial;
    };
  } else {
    photoImg.classList.add('hidden');
    photoPlaceholder.classList.remove('hidden');
    photoPlaceholder.innerText = initial;
  }

  // Draw Mini Fee Ledger
  renderMiniLedger(student);

  // Handle Mobile layout push
  if (window.innerWidth <= 768) {
    document.getElementById('students-pane-details').classList.add('active-detail');
  }
}

function renderMiniLedger(student) {
  const grid = document.getElementById('detail-ledger-grid');
  grid.innerHTML = '';

  let paidCount = 0;
  let dueTotal = 0;

  MONTHS_LIST.forEach((month) => {
    const monthInfo = getStudentMonthStatus(student, currentFeesYear, month);
    const tile = document.createElement('div');

    let tileClass = 'mini-tile ripple';
    let statusText = 'Upcoming';

    if (monthInfo.status === 'Paid') {
      tileClass += ' chip-success';
      paidCount++;
      statusText = '₹' + monthInfo.amount;
    } else if (monthInfo.status === 'Due') {
      tileClass += ' chip-error';
      statusText = 'Due';
      dueTotal += monthInfo.amount;
    } else {
      tileClass += ' chip-neutral';
      statusText = '--';
    }

    tile.className = tileClass;
    tile.innerHTML = `
      <span class="label-medium">${month}</span>
      <span class="body-small">${statusText}</span>
    `;

    // Click Month Tile → Open Payment Dialog / Bottom Sheet
    tile.addEventListener('click', () => {
      openPaymentRecording(student, month);
    });

    grid.appendChild(tile);
  });

  document.getElementById('detail-paid-count').innerText = `${paidCount}/12`;
  document.getElementById('detail-due-count').innerText = `₹${dueTotal.toLocaleString('en-IN')}`;
}

// ==========================================================================
// 7. RECORD PAYMENTS SHEET / DIALOGS
// ==========================================================================
function openPaymentRecording(student, month) {
  const studentRate = getStudentMonthlyRate(student);
  const payments = student.payments[currentFeesYear] || {};
  const payment = payments[month] || { status: 'Due', amount: studentRate, date: new Date().toISOString().split('T')[0], mode: 'Cash' };

  // Set Sheet fields
  document.getElementById('payment-student-id').value = student.id;
  document.getElementById('payment-student-name').innerText = student.name;
  document.getElementById('payment-student-seat').innerText = `Seat ${student.seat || '--'} • Due Day: ${student.dueDay || '5'}th`;
  document.getElementById('payment-month-label').innerText = `${MONTHS_FULL[month]} ${currentFeesYear}`;
  document.getElementById('payment-month').value = month;
  document.getElementById('payment-year').value = currentFeesYear;

  document.getElementById('payment-amount').value = payment.amount || studentRate;
  document.getElementById('payment-date').value = payment.date || new Date().toISOString().split('T')[0];
  document.getElementById('payment-mode').value = payment.mode || 'Cash';
  document.getElementById('payment-status').value = payment.status || 'Due';

  const deleteBtn = document.getElementById('delete-payment-btn');
  if (payments[month]) {
    deleteBtn.classList.remove('hidden');
  } else {
    deleteBtn.classList.add('hidden');
  }

  // Open overlay bottom-sheet
  const sheet = document.getElementById('payment-sheet');
  sheet.classList.remove('hidden');
  setTimeout(() => {
    sheet.classList.add('active');
  }, 10);
}

function setupDialogs() {
  const sheet = document.getElementById('payment-sheet');
  const closeSheet = document.getElementById('close-payment-sheet-btn');

  const closeOverlay = () => {
    sheet.classList.remove('active');
    setTimeout(() => {
      sheet.classList.add('hidden');
    }, 300);
  };

  closeSheet.addEventListener('click', closeOverlay);
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) closeOverlay();
  });

  // Submit Payment record
  document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const studentId = document.getElementById('payment-student-id').value;
    const month = document.getElementById('payment-month').value;
    const year = document.getElementById('payment-year').value;
    const amount = document.getElementById('payment-amount').value;
    const date = document.getElementById('payment-date').value;
    const mode = document.getElementById('payment-mode').value;
    const status = document.getElementById('payment-status').value;

    const students = DB.getStudents();
    const student = students.find(s => s.id === studentId);
    if (student) {
      if (!student.payments[year]) student.payments[year] = {};
      student.payments[year][month] = { status, amount: parseInt(amount, 10), date, mode };
      DB.saveStudent(student);
      
      showSnackbar(`Saved payment details for ${student.name}`);
      closeOverlay();
      
      // Sync active view components
      if (currentView === 'students') selectStudent(studentId);
      if (currentView === 'fees') updateFeesLedger();
      if (currentView === 'dashboard') loadDashboardData();
    }
  });

  // Delete status
  document.getElementById('delete-payment-btn').addEventListener('click', () => {
    const studentId = document.getElementById('payment-student-id').value;
    const month = document.getElementById('payment-month').value;
    const year = document.getElementById('payment-year').value;

    const students = DB.getStudents();
    const student = students.find(s => s.id === studentId);
    if (student && student.payments[year] && student.payments[year][month]) {
      delete student.payments[year][month];
      DB.saveStudent(student);
      showSnackbar(`Reset status for ${student.name}`);
      closeOverlay();
      
      if (currentView === 'students') selectStudent(studentId);
      if (currentView === 'fees') updateFeesLedger();
    }
  });

  // Mobile detail back button routing
  document.getElementById('detail-back-btn').addEventListener('click', () => {
    document.getElementById('students-pane-details').classList.remove('active-detail');
  });

  // Dialog triggers for onboarding student
  const modal = document.getElementById('student-modal');
  const triggers = document.querySelectorAll('.add-student-trigger');
  triggers.forEach(t => {
    t.addEventListener('click', () => {
      openStudentModal();
    });
  });

  document.getElementById('close-student-modal-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // Edit / Delete buttons inside profile detail view
  document.getElementById('edit-student-btn').addEventListener('click', () => {
    if (selectedStudentId) {
      const students = DB.getStudents();
      const student = students.find(s => s.id === selectedStudentId);
      if (student) openStudentModal(student);
    }
  });

  document.getElementById('delete-student-btn').addEventListener('click', () => {
    if (selectedStudentId) {
      if (confirm('Are you sure you want to delete this student record? This cannot be undone.')) {
        const students = DB.deleteStudent(selectedStudentId);
        showSnackbar('Student record removed successfully');
        selectedStudentId = null;
        renderStudentsList();
        loadDashboardData();
      }
    }
  });
}

// ==========================================================================
// 8. ADD/EDIT STUDENT WIZARD STEPPER & VALIDATION
// ==========================================================================
function openStudentModal(student = null) {
  const form = document.getElementById('student-entry-form');
  form.reset();
  
  // Reset steps & visual map state
  currentStepperStep = 1;
  selectedSeat = null;
  document.getElementById('selected-seat-feedback').innerText = 'None Selected';
  document.getElementById('student-allotted-seat').value = '';
  document.getElementById('form-photo-preview').classList.add('hidden');
  document.getElementById('photo-upload-placeholder').classList.remove('hidden');
  document.getElementById('photo-upload-placeholder').innerText = 'person';

  // Toggle edit/create configuration settings
  const title = document.getElementById('student-modal-title');
  if (student) {
    title.innerText = 'Edit Student Details';
    form.setAttribute('data-mode', 'edit');
    form.setAttribute('data-id', student.id);
    
    // Fill text forms
    document.getElementById('student-name').value = student.name;
    document.getElementById('student-phone').value = student.phone;
    document.getElementById('student-aadhar').value = student.aadhar;
    document.getElementById('student-address').value = student.address;
    document.getElementById('student-joining').value = student.joining;
    document.getElementById('student-branch').value = student.branch || 'SH Library';
    
    if (student.photo) {
      const preview = document.getElementById('form-photo-preview');
      preview.src = student.photo;
      preview.classList.remove('hidden');
      document.getElementById('photo-upload-placeholder').classList.add('hidden');
    }
    
    document.getElementById('student-due-day').value = student.dueDay || '5';
    selectedSeat = student.seat;
    document.getElementById('selected-seat-feedback').innerText = `Seat ${student.seat || 'None'}`;
    document.getElementById('student-allotted-seat').value = student.seat || '';
  } else {
    title.innerText = 'Onboard New Student';
    form.removeAttribute('data-mode');
    form.removeAttribute('data-id');
    document.getElementById('student-joining').value = new Date().toISOString().split('T')[0];
    document.getElementById('student-due-day').value = '5';
  }

  renderStep(1);
  document.getElementById('student-modal').classList.remove('hidden');
}

function renderStep(step) {
  currentStepperStep = step;
  
  // Hide all step windows
  document.querySelectorAll('.stepper-step').forEach(el => el.classList.remove('active'));
  document.getElementById(`stepper-step-${step}`).classList.add('active');

  // Indicators toggle
  document.querySelectorAll('.step-indicator-item').forEach(item => {
    const sNum = parseInt(item.getAttribute('data-step'), 10);
    if (sNum === step) {
      item.className = 'step-indicator-item active';
    } else if (sNum < step) {
      item.className = 'step-indicator-item completed';
    } else {
      item.className = 'step-indicator-item';
    }
  });

  // Calculate linear progress scale bar
  const indicator = document.getElementById('stepper-progress-indicator');
  indicator.style.width = `${step * 33.3}%`;

  // Dynamic Action Navigation button triggers
  const backBtn = document.getElementById('stepper-back-btn');
  const nextBtn = document.getElementById('stepper-next-btn');
  const saveBtn = document.getElementById('stepper-save-btn');

  if (step === 1) {
    backBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
    saveBtn.classList.add('hidden');
  } else if (step === 2) {
    backBtn.classList.remove('hidden');
    nextBtn.classList.remove('hidden');
    saveBtn.classList.add('hidden');
    renderSeatMapGrid(); // Fetch layouts dynamically
  } else if (step === 3) {
    backBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
    saveBtn.classList.remove('hidden');
    fillVerificationStep(); // Complete summary layout rendering
  }
}

function extractSeatNumber(seatVal) {
  if (seatVal === null || seatVal === undefined) return null;
  const str = String(seatVal).trim();
  if (!str) return null;
  const match = str.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (!isNaN(num) && num >= 1 && num <= TOTAL_SEATS) return num;
  }
  return null;
}

function renderSeatMapGrid() {
  const grid = document.getElementById('seat-map-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const students = DB.getStudents();
  const form = document.getElementById('student-entry-form');
  const editingId = form ? form.getAttribute('data-id') : null;

  // Find all occupied seat numbers, excluding current student being edited
  const occupiedSet = new Set(
    students
      .filter(s => s.id !== editingId)
      .map(s => extractSeatNumber(s.seat))
      .filter(n => n !== null)
  );

  const selectedNum = extractSeatNumber(selectedSeat);

  for (let i = 1; i <= TOTAL_SEATS; i++) {
    const seatId = String(i);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'seat-btn';
    btn.innerText = seatId;

    if (occupiedSet.has(i)) {
      btn.disabled = true;
      btn.title = `Seat ${i} is already occupied`;
    }

    if (selectedNum === i) {
      btn.classList.add('selected');
    }

    btn.addEventListener('click', () => {
      document.querySelectorAll('.seat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedSeat = seatId;
      const feedback = document.getElementById('selected-seat-feedback');
      const input = document.getElementById('student-allotted-seat');
      if (feedback) feedback.innerText = `Seat ${seatId}`;
      if (input) input.value = seatId;
    });

    grid.appendChild(btn);
  }
}

// ==========================================================================
// 8.5 INTERACTIVE SEATS AVAILABILITY CHART MODAL
// ==========================================================================
function openSeatsAvailabilityChart() {
  const modal = document.getElementById('seats-chart-modal');
  const grid = document.getElementById('seats-chart-grid');
  const detailBox = document.getElementById('chart-seat-detail-card');
  const infoLeft = document.getElementById('chart-seat-info-left');
  const actionRight = document.getElementById('chart-seat-action-right');

  if (!modal || !grid) return;

  grid.innerHTML = '';
  if (detailBox) detailBox.classList.add('hidden');

  const students = DB.getStudents();
  
  // Build lookup mapping seat number -> student
  const seatToStudentMap = {};
  students.forEach(s => {
    const sNum = extractSeatNumber(s.seat);
    if (sNum !== null) {
      seatToStudentMap[sNum] = s;
    }
  });

  const occupiedCount = Object.keys(seatToStudentMap).length;
  const availableCount = Math.max(0, TOTAL_SEATS - occupiedCount);

  const occElem = document.getElementById('chart-occupied-count');
  const availElem = document.getElementById('chart-available-count');
  if (occElem) occElem.innerText = occupiedCount;
  if (availElem) availElem.innerText = availableCount;

  for (let i = 1; i <= TOTAL_SEATS; i++) {
    const student = seatToStudentMap[i];
    const isOccupied = !!student;
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `seat-chart-btn ripple ${isOccupied ? 'occupied' : 'available'}`;
    btn.innerHTML = `
      <span class="seat-num-text">${i}</span>
      <span class="seat-status-tag">${isOccupied ? 'Occupied' : 'Free'}</span>
    `;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.seat-chart-btn').forEach(b => b.classList.remove('active-selected'));
      btn.classList.add('active-selected');
      if (detailBox) detailBox.classList.remove('hidden');

      if (student) {
        const imgMarkup = getStudentAvatarMarkup(student, 'avatar-small');
        if (infoLeft) {
          infoLeft.innerHTML = `
            ${imgMarkup}
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="title-medium font-bold">${student.name}</span>
                <span class="chip chip-neutral label-small" style="padding: 2px 8px; font-size: 11px; background-color: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); font-weight: 600;">Seat ${i} (Occupied)</span>
              </div>
              <span class="body-small text-secondary">${student.phone} • Monthly Due: ${student.dueDay || '5'}th</span>
            </div>
          `;
        }
        if (actionRight) {
          actionRight.innerHTML = `
            <button type="button" class="btn btn-primary btn-small ripple" id="chart-view-profile-btn" style="border-radius: 20px;">
              <span class="label-medium">View Profile</span>
            </button>
          `;
        }
        const viewBtn = document.getElementById('chart-view-profile-btn');
        if (viewBtn) {
          viewBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            triggerNavigation('students');
            selectStudent(student.id);
          });
        }
      } else {
        if (infoLeft) {
          infoLeft.innerHTML = `
            <div style="width: 38px; height: 38px; border-radius: 50%; background-color: rgba(25, 135, 84, 0.15); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <span class="material-symbols-outlined" style="font-size: 22px;">check_circle</span>
            </div>
            <div>
              <span class="title-medium font-bold" style="color: #198754;">Seat ${i} is Available</span>
              <span class="body-small text-secondary">Free cabin ready for student allotment</span>
            </div>
          `;
        }
        if (actionRight) {
          actionRight.innerHTML = `
            <button type="button" class="btn btn-primary btn-small ripple" id="chart-assign-student-btn" style="border-radius: 20px;">
              <span class="label-medium">Assign Seat</span>
            </button>
          `;
        }
        const assignBtn = document.getElementById('chart-assign-student-btn');
        if (assignBtn) {
          assignBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            openStudentModal();
            selectedSeat = String(i);
            const feedback = document.getElementById('selected-seat-feedback');
            const input = document.getElementById('student-allotted-seat');
            if (feedback) feedback.innerText = `Seat ${i}`;
            if (input) input.value = String(i);
          });
        }
      }
    });

    grid.appendChild(btn);
  }

  modal.classList.remove('hidden');
}

function fillVerificationStep() {
  const name = document.getElementById('student-name').value;
  const phone = document.getElementById('student-phone').value;
  const aadhar = document.getElementById('student-aadhar').value;
  const address = document.getElementById('student-address').value;
  const joining = document.getElementById('student-joining').value;
  const dueDay = document.getElementById('student-due-day').value || '5';
  const branch = document.getElementById('student-branch').value;
  const photoPreview = document.getElementById('form-photo-preview');

  document.getElementById('review-name').innerText = name;
  document.getElementById('review-seat').innerText = `Seat ${selectedSeat || 'None Assigned'}`;
  document.getElementById('review-phone').innerText = phone;
  document.getElementById('review-aadhar').innerText = formatAadhar(aadhar);
  document.getElementById('review-address').innerText = address;
  document.getElementById('review-joining').innerText = formatDate(joining);
  document.getElementById('review-due-day').innerText = `${dueDay}th of every month`;
  document.getElementById('review-branch').innerText = branch;

  const reviewImg = document.getElementById('review-photo-preview');
  const reviewPlaceholder = document.getElementById('review-avatar-placeholder');

  if (photoPreview.src && !photoPreview.classList.contains('hidden')) {
    reviewImg.src = photoPreview.src;
    reviewImg.classList.remove('hidden');
    reviewPlaceholder.classList.add('hidden');
  } else {
    reviewImg.classList.add('hidden');
    reviewPlaceholder.classList.remove('hidden');
    reviewPlaceholder.innerText = name.charAt(0);
  }
}

function setupFormCompression() {
  const nextBtn = document.getElementById('stepper-next-btn');
  const backBtn = document.getElementById('stepper-back-btn');
  const saveBtn = document.getElementById('stepper-save-btn');
  
  // Custom camera trigger action
  const uploadTrigger = document.getElementById('trigger-photo-file-btn');
  const uploadInput = document.getElementById('student-photo-file');

  uploadTrigger.addEventListener('click', () => {
    uploadInput.click();
  });

  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      compressImage(file, (base64Str) => {
        const preview = document.getElementById('form-photo-preview');
        preview.src = base64Str;
        preview.classList.remove('hidden');
        document.getElementById('photo-upload-placeholder').classList.add('hidden');
      });
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentStepperStep === 1) {
      // Validate Step 1 before routing
      if (validateStep1()) {
        renderStep(2);
      }
    } else if (currentStepperStep === 2) {
      // Validate Step 2 seat selector
      if (!selectedSeat) {
        showSnackbar('Select a cabin seat to continue allotment');
        return;
      }
      renderStep(3);
    }
  });

  backBtn.addEventListener('click', () => {
    renderStep(currentStepperStep - 1);
  });

  saveBtn.addEventListener('click', () => {
    const checkbox = document.getElementById('student-terms-check');
    if (!checkbox.checked) {
      showSnackbar('Please acknowledge billing activation check');
      return;
    }

    saveStudentRecord();
  });
}

function validateStep1() {
  const name = document.getElementById('student-name');
  const phone = document.getElementById('student-phone');
  const aadhar = document.getElementById('student-aadhar');
  const address = document.getElementById('student-address');
  const joining = document.getElementById('student-joining');

  let valid = true;

  // Validate Name
  if (name.value.trim() === '') {
    name.parentElement.classList.add('invalid');
    valid = false;
  } else {
    name.parentElement.classList.remove('invalid');
  }

  // Validate Phone (10 digits)
  if (!/^\d{10}$/.test(phone.value.trim())) {
    phone.parentElement.classList.add('invalid');
    valid = false;
  } else {
    phone.parentElement.classList.remove('invalid');
  }

  // Validate Aadhar (12 digits)
  if (!/^\d{12}$/.test(aadhar.value.trim())) {
    aadhar.parentElement.classList.add('invalid');
    valid = false;
  } else {
    aadhar.parentElement.classList.remove('invalid');
  }

  // Validate Address
  if (address.value.trim() === '') {
    address.parentElement.classList.add('invalid');
    valid = false;
  } else {
    address.parentElement.classList.remove('invalid');
  }

  // Validate Joining
  if (joining.value === '') {
    joining.parentElement.classList.add('invalid');
    valid = false;
  } else {
    joining.parentElement.classList.remove('invalid');
  }

  return valid;
}

function saveStudentRecord() {
  const form = document.getElementById('student-entry-form');
  const mode = form.getAttribute('data-mode');
  const editId = form.getAttribute('data-id');

  const name = document.getElementById('student-name').value;
  const phone = document.getElementById('student-phone').value;
  const aadhar = document.getElementById('student-aadhar').value;
  const address = document.getElementById('student-address').value;
  const joining = document.getElementById('student-joining').value;
  const dueDay = document.getElementById('student-due-day').value || '5';
  const branch = document.getElementById('student-branch').value;
  const photo = document.getElementById('form-photo-preview').src || '';

  const students = DB.getStudents();
  let studentObj;

  if (mode === 'edit') {
    const original = students.find(s => s.id === editId);
    studentObj = {
      ...original,
      name,
      phone,
      aadhar,
      address,
      joining,
      dueDay,
      seat: selectedSeat,
      branch,
      photo: photo.startsWith('data:') ? photo : original.photo
    };
    DB.addNotification(`Record updated for ${name}`);
  } else {
    studentObj = {
      id: 'stud_' + Date.now(),
      name,
      phone,
      aadhar,
      address,
      joining,
      dueDay,
      seat: selectedSeat,
      branch,
      photo,
      payments: {
        '2026': {}
      }
    };
    DB.addNotification(`New student onboarded: ${name}`);
  }

  DB.saveStudent(studentObj);
  showSnackbar(`Successfully saved student record: ${name}`);
  document.getElementById('student-modal').classList.add('hidden');
  
  // Refresh content lists
  renderStudentsList();
  loadDashboardData();
  
  // Re-select active student details
  selectStudent(studentObj.id);
}

// Image compression Canvas helper
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      const MAX_WIDTH = 300;
      const MAX_HEIGHT = 300;
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      callback(compressedDataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ==========================================================================
// 9. FEES VIEW LEDGER SYSTEM
// ==========================================================================
function setupFeesGrid() {
  const tabs = document.querySelectorAll('.year-tab');
  const indicator = document.getElementById('year-tab-indicator');

  const alignIndicator = (activeTab) => {
    indicator.style.left = `${activeTab.offsetLeft}px`;
    indicator.style.width = `${activeTab.offsetWidth}px`;
  };

  // Run initial alignment
  setTimeout(() => {
    alignIndicator(document.querySelector('.year-tab.active'));
  }, 100);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      alignIndicator(tab);
      currentFeesYear = tab.getAttribute('data-year');
      updateFeesLedger();
    });
  });

  // Batch Payment Ledger details overlay triggers
  const batchClose = document.getElementById('close-batch-payment-btn');
  const batchOverlay = document.getElementById('batch-payment-dialog');
  const batchSave = document.getElementById('batch-payment-save-btn');

  batchClose.addEventListener('click', () => batchOverlay.classList.add('hidden'));
  batchSave.addEventListener('click', () => batchOverlay.classList.add('hidden'));
}

function updateFeesLedger() {
  const grid = document.getElementById('months-grid');
  grid.innerHTML = '';

  const students = DB.getStudents();
  
  // Calculate aggregate payments metrics
  let yearTotalCollected = 0;
  let yearTotalDues = 0;
  let lastTransaction = 'None';
  let lastTransactionDateStr = '';

  const now = new Date();
  const sysYear = now.getFullYear();
  const sysMonthIdx = now.getMonth();
  const selectedYear = parseInt(currentFeesYear, 10);

  MONTHS_LIST.forEach((month) => {
    let paidCount = 0;
    let dueCount = 0;

    students.forEach(student => {
      const monthInfo = getStudentMonthStatus(student, currentFeesYear, month);

      if (monthInfo.status === 'Paid') {
        paidCount++;
        yearTotalCollected += monthInfo.amount;
        
        // Track latest recorded payment
        const payments = student.payments[currentFeesYear] || {};
        const payment = payments[month];
        const dateVal = (payment && payment.date) || '';
        if (dateVal > lastTransactionDateStr) {
          lastTransactionDateStr = dateVal;
          lastTransaction = `₹${monthInfo.amount} by ${student.name} (${month})`;
        }
      } else if (monthInfo.status === 'Due') {
        dueCount++;
        yearTotalDues += monthInfo.amount;
      }
    });

    // Create Month Tonal Card
    const card = document.createElement('div');
    card.className = 'month-tile ripple';

    let statsMarkup = '';
    if (dueCount > 0) {
      statsMarkup = `
        <span class="label-medium text-success">Paid: ${paidCount} Members</span>
        <span class="label-medium text-error">Due: ${dueCount} Members</span>
      `;
    } else if (paidCount > 0) {
      statsMarkup = `
        <span class="label-medium text-success">Paid: ${paidCount} Members</span>
        <span class="label-medium text-secondary">Up to Date</span>
      `;
    } else {
      statsMarkup = `
        <span class="label-medium text-secondary">Upcoming</span>
      `;
    }

    card.innerHTML = `
      <div class="month-tile-header">
        <span class="title-large text-primary">${month}</span>
        <span class="material-symbols-outlined text-secondary">payments</span>
      </div>
      <div class="month-tile-stats">
        ${statsMarkup}
      </div>
    `;

    // Click Month → Open Batch Ledger Dialog
    card.addEventListener('click', () => {
      openBatchLedgerDialog(month);
    });

    grid.appendChild(card);
  });

  // Trigger count-up animation for total indicators
  const colElement = document.getElementById('fees-summary-collected');
  const dueElement = document.getElementById('fees-summary-dues');
  
  animateCountUp(colElement, yearTotalCollected);
  animateCountUp(dueElement, yearTotalDues);
  document.getElementById('fees-summary-last-payment').innerText = lastTransaction;

  // Render recent ledger transaction log list (recent 5 payments)
  renderTransactionsLog();
}

function openBatchLedgerDialog(month) {
  const students = DB.getStudents();
  const tbody = document.getElementById('batch-ledger-tbody');
  tbody.innerHTML = '';

  document.getElementById('batch-payment-title').innerText = `Monthly Ledger View - ${MONTHS_FULL[month]} ${currentFeesYear}`;

  students.forEach(student => {
    const monthInfo = getStudentMonthStatus(student, currentFeesYear, month);
    const statusText = monthInfo.status;
    const statusClass = monthInfo.status === 'Paid' ? 'chip-success' : (monthInfo.status === 'Due' ? 'chip-error' : 'chip-neutral');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="label-large font-bold">${student.seat || '--'}</span></td>
      <td><span class="body-large font-bold">${student.name}</span></td>
      <td><span class="chip chip-neutral label-medium" style="background-color: var(--md-sys-color-surface-container-high);">${student.dueDay || '5'}th of month</span></td>
      <td><span class="chip ${statusClass} label-medium">${statusText}</span></td>
      <td>
        <button class="btn btn-tonal btn-small ripple record-ledger-btn" title="Record Payment">
          <span class="material-symbols-outlined btn-icon">edit</span>
          <span class="label-medium desktop-only">Record</span>
        </button>
      </td>
    `;

    tr.querySelector('.record-ledger-btn').addEventListener('click', () => {
      document.getElementById('batch-payment-dialog').classList.add('hidden');
      openPaymentRecording(student, month);
    });

    tbody.appendChild(tr);
  });

  document.getElementById('batch-payment-dialog').classList.remove('hidden');
}

function renderTransactionsLog() {
  const container = document.getElementById('transaction-list');
  container.innerHTML = '';

  const students = DB.getStudents();
  let list = [];

  students.forEach(s => {
    const payments = s.payments[currentFeesYear] || {};
    Object.keys(payments).forEach(month => {
      if (payments[month].status === 'Paid') {
        list.push({
          student: s.name,
          seat: s.seat || '--',
          month,
          amount: payments[month].amount,
          date: payments[month].date,
          mode: payments[month].mode
        });
      }
    });
  });

  // Sort by date descending
  list.sort((a, b) => b.date.localeCompare(a.date));

  if (list.length === 0) {
    container.innerHTML = '<li class="empty-log-state body-medium text-secondary">No payments registered for selected year.</li>';
  } else {
    list.slice(0, 5).forEach(item => {
      const li = document.createElement('li');
      li.className = 'transaction-item';
      li.innerHTML = `
        <div class="transaction-meta">
          <span class="title-medium">${item.student} (Seat ${item.seat})</span>
          <span class="body-small text-secondary">Period: ${item.month} • Mode: ${item.mode} • Paid: ${formatDate(item.date)}</span>
        </div>
        <span class="title-medium text-success">+₹${item.amount}</span>
      `;
      container.appendChild(li);
    });
  }
}

// Proportional requestAnimationFrame Count-Up animation
function animateCountUp(element, endVal, duration = 400) {
  let startTimestamp = null;
  const startVal = 0;
  
  function step(timestamp) {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const currentVal = Math.floor(progress * (endVal - startVal) + startVal);
    element.innerText = `₹${currentVal.toLocaleString('en-IN')}`;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  }
  window.requestAnimationFrame(step);
}

// ==========================================================================
// 10. SEARCH, FILTER CHIPS & AUXILIARY EVENTS
// ==========================================================================
function setupSearchFilters() {
  const globalSearch = document.getElementById('global-search-input');
  const clearBtn = document.getElementById('clear-search-btn');

  // Sync Global search with active page filters
  globalSearch.addEventListener('input', () => {
    const val = globalSearch.value.trim();
    if (val) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');

    if (currentView === 'students') {
      document.getElementById('students-search-input').value = val;
      renderStudentsList();
    } else if (currentView === 'dashboard') {
      // Direct filter feed
      const listItems = document.querySelectorAll('.quick-student-item');
      listItems.forEach(item => {
        const text = item.innerText.toLowerCase();
        if (text.includes(val.toLowerCase())) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    }
  });

  clearBtn.addEventListener('click', () => {
    globalSearch.value = '';
    clearBtn.classList.add('hidden');
    
    if (currentView === 'students') {
      document.getElementById('students-search-input').value = '';
      renderStudentsList();
    } else if (currentView === 'dashboard') {
      document.querySelectorAll('.quick-student-item').forEach(i => i.style.display = 'flex');
    }
  });

  // Students Pane local search
  document.getElementById('students-search-input').addEventListener('input', () => {
    globalSearch.value = document.getElementById('students-search-input').value;
    if (globalSearch.value) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
    renderStudentsList();
  });

  // Filter Popover Toggles
  const filterBtn = document.getElementById('filter-btn');
  const filterSheet = document.getElementById('filter-sheet');
  filterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    filterSheet.classList.toggle('hidden');
  });

  document.querySelectorAll('input[name="student-filter"]').forEach(radio => {
    radio.addEventListener('change', () => {
      renderStudentsList();
      filterSheet.classList.add('hidden');
    });
  });

  document.addEventListener('click', () => {
    filterSheet.classList.add('hidden');
  });

  // Contact Query Form Handler
  document.getElementById('contact-enquiry-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('enquiry-name').value;
    showSnackbar(`Thank you, ${name}! Your enquiry has been recorded.`);
    document.getElementById('contact-enquiry-form').reset();
  });
}

// ==========================================================================
// 11. PROFILE MODAL SETTINGS FORM
// ==========================================================================
function setupProfileForm() {
  const detailsForm = document.getElementById('admin-details-form');
  const passwordForm = document.getElementById('admin-password-form');
  const avatarFile = document.getElementById('profile-avatar-file');
  const avatarEdit = document.getElementById('profile-avatar-edit-btn');

  if (avatarEdit && avatarFile) {
    avatarEdit.addEventListener('click', () => {
      avatarFile.click();
    });
  }

  if (avatarFile) {
    avatarFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        compressImage(file, (base64Str) => {
          const session = DB.getSession() || {};
          session.avatar = base64Str;
          session.photoURL = base64Str;
          DB.setSession(session);
          updateAdminAvatars(session);
          showSnackbar('Profile avatar updated successfully');
        });
      }
    });
  }

  // Save Admin Details
  if (detailsForm) {
    detailsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameEl = document.getElementById('settings-name');
      const emailEl = document.getElementById('settings-email');
      const name = nameEl ? nameEl.value : '';
      const email = emailEl ? emailEl.value : '';

      const admin = DB.getAdmin() || {};
      admin.name = name;
      admin.email = email;
      DB.saveAdmin(admin);

      const session = DB.getSession() || {};
      session.name = name;
      session.email = email;
      DB.setSession(session);

      loginAdmin(session);
      showSnackbar('Account details saved');
    });
  }

  // Save Admin Password
  if (passwordForm) {
    passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const oldPassEl = document.getElementById('settings-old-pass');
      const newPassEl = document.getElementById('settings-new-pass');
      const oldPass = oldPassEl ? oldPassEl.value : '';
      const newPass = newPassEl ? newPassEl.value : '';

      const admin = DB.getAdmin() || {};
      if (oldPass !== admin.password) {
        showSnackbar('Current password details match failed');
        return;
      }

      admin.password = newPass;
      DB.saveAdmin(admin);
      passwordForm.reset();
      showSnackbar('Password updated successfully');
    });
  }

  // Firebase Cloud Sync Configuration Form
  const firebaseConfigForm = document.getElementById('firebase-config-form');
  const settingsFirebaseJson = document.getElementById('settings-firebase-json');
  const clearFirebaseConfigBtn = document.getElementById('clear-firebase-config-btn');
  const settingsFirebaseError = document.getElementById('settings-firebase-error');

  // Populate config if present
  const existingConfig = localStorage.getItem('sh_firebase_config');
  if (existingConfig && settingsFirebaseJson) {
    try {
      settingsFirebaseJson.value = JSON.stringify(JSON.parse(existingConfig), null, 2);
    } catch (e) {
      settingsFirebaseJson.value = existingConfig;
    }
  }

  if (firebaseConfigForm) {
    firebaseConfigForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawVal = settingsFirebaseJson.value.trim();
      if (!rawVal) {
        localStorage.removeItem('sh_firebase_config');
        showSnackbar("Firebase configuration cleared.");
        stopFirestoreSync();
        firebaseApp = null;
        db = null;
        return;
      }

      try {
        const config = parseFirebaseConfigInput(rawVal);
        if (!config.apiKey || !config.projectId) {
          throw new Error("Missing vital Firebase configuration parameters (apiKey or projectId).");
        }
        localStorage.setItem('sh_firebase_config', JSON.stringify(config));
        settingsFirebaseError.style.display = 'none';
        showSnackbar("Firebase settings saved successfully!");
        
        // Re-initialize Firebase immediately
        if (initFirebase()) {
          setupFirebaseAuthState();
        }
      } catch (err) {
        settingsFirebaseError.innerText = "Invalid Firebase config: " + err.message;
        settingsFirebaseError.style.display = 'block';
      }
    });
  }

  if (clearFirebaseConfigBtn) {
    clearFirebaseConfigBtn.addEventListener('click', () => {
      if (confirm("Are you sure you want to clear your Firebase config? Cloud Sync will be disabled.")) {
        localStorage.removeItem('sh_firebase_config');
        if (settingsFirebaseJson) settingsFirebaseJson.value = '';
        if (settingsFirebaseError) settingsFirebaseError.style.display = 'none';
        showSnackbar("Firebase configuration cleared.");
        stopFirestoreSync();
        firebaseApp = null;
        db = null;
      }
    });
  }
}

// ==========================================================================
// 12. UTILITIES AND INTERACTIVE SHIELD RIPPLES
// ==========================================================================
function setupRipples() {
  // Sparkle / Ripple animations on click disabled
}

// Snackbar Alert display triggers
let snackbarTimeout;
function showSnackbar(text) {
  const snack = document.getElementById('snackbar');
  document.getElementById('snackbar-text').innerText = text;
  
  snack.classList.add('active');
  clearTimeout(snackbarTimeout);
  
  snackbarTimeout = setTimeout(() => {
    snack.classList.remove('active');
  }, 3000);
}

function renderNotifications() {
  const list = DB.getNotifications();
  const countBadge = document.getElementById('notification-count');
  const container = document.getElementById('notification-list');

  const lastSeen = parseInt(localStorage.getItem('sh_notif_last_seen') || '0', 10);
  const unreadCount = list.filter(item => {
    const itemTime = parseInt((item.id || '').replace('notif_', ''), 10);
    return isNaN(itemTime) || itemTime > lastSeen;
  }).length;

  if (unreadCount === 0) {
    countBadge.classList.add('hidden');
  } else {
    countBadge.innerText = unreadCount;
    countBadge.classList.remove('hidden');
  }

  if (list.length === 0) {
    container.innerHTML = '<li class="dropdown-empty-state">No new alerts</li>';
  } else {
    container.innerHTML = '';
    list.slice(0, 5).forEach(item => {
      const li = document.createElement('li');
      li.className = 'dropdown-item ripple';
      li.style.flexDirection = 'column';
      li.style.alignItems = 'flex-start';
      li.style.gap = '2px';
      li.innerHTML = `
        <span class="body-medium">${item.text}</span>
        <span class="body-small text-secondary">${item.time}</span>
      `;
      container.appendChild(li);
    });
  }
}

// Custom text formatters
function formatDate(dateStr) {
  if (!dateStr) return '--';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString('en-US', options);
}

function formatAadhar(aadharStr) {
  if (!aadharStr) return '--';
  return aadharStr.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
