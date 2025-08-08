import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, addDoc, deleteDoc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { Home, Info, User, LogIn, LogOut, Megaphone, Sparkles, Upload, Briefcase, Trash, Users, MessageCircle, Heart, Settings, Download, X, Facebook, Instagram, Youtube, Phone, PhoneCall } from 'lucide-react';

// This is a placeholder for the AdSense script.
// It will be injected into the head of the document.
const adsenseScript = `
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4759102262341082"
        crossorigin="anonymous"></script>
`;

const ADMIN_CREDENTIALS = {
    username: 'Gaston',
    password: 'display80'
};
const ADMIN_PROFILE_PIC_URL = "https://placehold.co/150x150/52525B/FFFFFF?text=Admin";

function App() {
    // --- STATE MANAGEMENT ---
    const [appState, setAppState] = useState('home');
    const [user, setUser] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    // Data states
    const [announcements, setAnnouncements] = useState([]);
    const [adminPosts, setAdminPosts] = useState([]);
    const [users, setUsers] = useState([]);
    const [siteConfig, setSiteConfig] = useState({ title: "Vaddzy", tagline: "The ultimate creative hub to connect producers, artists, songwriters, and designers. Find your perfect collaborator and bring your vision to life." });
    const [myMedia, setMyMedia] = useState([]);
    const [likes, setLikes] = useState([]);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal/Form states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [registerError, setRegisterError] = useState('');

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // --- FIREBASE INITIALIZATION & AUTHENTICATION ---
    useEffect(() => {
        try {
            const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setDb(dbInstance);
            setAuth(authInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
                if (currentUser) {
                    const userDocRef = doc(dbInstance, `/artifacts/${appId}/public/data/users`, currentUser.uid);
                    onSnapshot(userDocRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const userData = docSnap.data();
                            setUser({ uid: currentUser.uid, ...userData, profilePicUrl: userData.profilePicUrl || `https://placehold.co/200x200/52525B/FFFFFF?text=${userData.username.charAt(0)}` });
                        }
                    });
                } else {
                    setUser(null);
                }
                setIsAuthReady(true);
            });

            const signIn = async () => {
                try {
                    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                    if (initialAuthToken) {
                        await signInWithCustomToken(authInstance, initialAuthToken);
                    } else {
                        await signInAnonymously(authInstance);
                    }
                } catch (e) {
                    console.error("Auth failed:", e);
                }
            };
            signIn();

            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase init failed:", error);
        }
    }, []);

    // --- FIRESTORE DATA LISTENERS ---
    useEffect(() => {
        if (!db || !isAuthReady) return;
        
        // Listen to announcements
        const announcementsQuery = query(collection(db, `/artifacts/${appId}/public/data/announcements`));
        const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
            const fetchedAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAnnouncements(fetchedAnnouncements.sort((a,b) => b.timestamp - a.timestamp));
        }, (error) => console.error("Error fetching announcements:", error));

        // Listen to admin posts
        const adminPostsQuery = query(collection(db, `/artifacts/${appId}/public/data/adminPosts`));
        const unsubscribeAdminPosts = onSnapshot(adminPostsQuery, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAdminPosts(fetchedPosts.sort((a,b) => b.timestamp - a.timestamp));
        }, (error) => console.error("Error fetching admin posts:", error));

        // Listen to comments
        const commentsQuery = query(collection(db, `/artifacts/${appId}/public/data/comments`));
        const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setComments(fetchedComments);
        }, (error) => console.error("Error fetching comments:", error));

        // Listen to likes
        const likesQuery = query(collection(db, `/artifacts/${appId}/public/data/likes`));
        const unsubscribeLikes = onSnapshot(likesQuery, (snapshot) => {
            const fetchedLikes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLikes(fetchedLikes);
        }, (error) => console.error("Error fetching likes:", error));

        // Listen to all users
        const usersQuery = query(collection(db, `/artifacts/${appId}/public/data/users`));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(fetchedUsers);
        }, (error) => console.error("Error fetching users:", error));

        // Listen to site config
        const siteConfigDocRef = doc(db, `/artifacts/${appId}/public/data/siteConfig/config`);
        const unsubscribeSiteConfig = onSnapshot(siteConfigDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setSiteConfig(docSnap.data());
            } else {
                setDoc(siteConfigDocRef, siteConfig); // Create default config if it doesn't exist
            }
        }, (error) => console.error("Error fetching site config:", error));

        return () => {
            unsubscribeAnnouncements();
            unsubscribeAdminPosts();
            unsubscribeComments();
            unsubscribeLikes();
            unsubscribeUsers();
            unsubscribeSiteConfig();
        };
    }, [db, isAuthReady, appId]);

    // Listen to current user's media
    useEffect(() => {
        if (!db || !user || user.role !== 'visitor') return;

        const mediaCollectionRef = collection(db, `/artifacts/${appId}/users/${user.uid}/media`);
        const unsubscribeMedia = onSnapshot(mediaCollectionRef, (snapshot) => {
            const fetchedMedia = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyMedia(fetchedMedia.sort((a,b) => b.timestamp - a.timestamp));
        }, (error) => console.error("Error fetching user media:", error));

        return () => unsubscribeMedia();
    }, [db, user, appId]);
    
    // Inject AdSense script
    useEffect(() => {
        const head = document.head || document.getElementsByTagName('head')[0];
        const script = document.createElement('script');
        script.async = true;
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4759102262341082";
        script.setAttribute('crossorigin', 'anonymous');
        head.appendChild(script);

        return () => {
            head.removeChild(script);
        };
    }, []);

    // --- AUTHENTICATION HANDLERS ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const username = e.target.querySelector('#login-username').value;
        const password = e.target.querySelector('#login-password').value;
        setLoginError('');

        // --- BUG FIX ---
        // The previous code had a logic flaw where it would check for admin credentials
        // but not set the user state properly. This is now fixed.
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            try {
                // We're simulating an admin login without a real Firebase user
                const adminUser = {
                    uid: 'admin',
                    username: ADMIN_CREDENTIALS.username,
                    role: 'admin',
                    isBanned: false,
                    profilePicUrl: ADMIN_PROFILE_PIC_URL,
                };
                setUser(adminUser); // Correctly set the user state for the admin
                setAppState('admin');
                setIsModalOpen(false);
            } catch (e) {
                setLoginError("Admin login failed. Try again.");
                console.error(e);
            } finally {
                setLoading(false);
            }
            return;
        }

        const userFound = users.find(u => u.username === username && u.password === password);
        if (userFound) {
            if (userFound.isBanned) {
                setLoginError('This account has been banned.');
            } else {
                setUser(userFound); // Set the local user state
                setAppState('visitor');
                setIsModalOpen(false);
            }
        } else {
            setLoginError('Invalid credentials. Please try again.');
        }
        setLoading(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        const username = e.target.querySelector('#register-username').value;
        const password = e.target.querySelector('#register-password').value;
        setRegisterError('');

        const userExists = users.some(u => u.username === username);
        if (userExists) {
            setRegisterError('Username already registered.');
            setLoading(false);
            return;
        }

        try {
            const newUser = {
                uid: nanoid(),
                username,
                password,
                role: 'visitor',
                isBanned: false,
                profilePicUrl: `https://placehold.co/200x200/52525B/FFFFFF?text=${username.charAt(0)}`
            };

            await addDoc(collection(db, `/artifacts/${appId}/public/data/users`), newUser);
            setUser(newUser);
            setAppState('profile');
            setIsModalOpen(false);
        } catch (e) {
            setRegisterError("Registration failed. Please try again.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    
    const handleLogout = async () => {
        try {
            if (user?.role === 'admin') {
                setUser(null);
                setAppState('home');
            } else {
                await signOut(auth);
                setUser(null);
                setAppState('home');
            }
        } catch (e) {
            console.error("Error logging out:", e);
        }
    };

    // --- FIRESTORE CRUD HANDLERS ---
    const handleAddAnnouncement = async (e) => {
        e.preventDefault();
        const text = e.target.querySelector('#admin-announcement-text').value;
        if (text.trim()) {
            await addDoc(collection(db, `/artifacts/${appId}/public/data/announcements`), {
                text,
                timestamp: Date.now()
            });
            e.target.reset();
        }
    };

    const handleDeleteAnnouncement = async (id) => {
        await deleteDoc(doc(db, `/artifacts/${appId}/public/data/announcements/${id}`));
    };

    const handlePostAdminContent = async (e) => {
        e.preventDefault();
        const title = e.target.querySelector('#admin-post-title').value;
        const fileInput = e.target.querySelector('#admin-post-file');
        const file = fileInput.files[0];
        
        if (!file) return;

        const fileType = file.type.split('/')[0];
        const newPost = {
            title,
            type: fileType,
            filename: file.name,
            url: `https://placehold.co/400x200/52525B/FFFFFF?text=${encodeURIComponent(title)}`,
            timestamp: Date.now()
        };
        
        await addDoc(collection(db, `/artifacts/${appId}/public/data/adminPosts`), newPost);
        e.target.reset();
    };

    const handleUpdateSiteConfig = async (e) => {
        e.preventDefault();
        const title = e.target.querySelector('#edit-title').value;
        const tagline = e.target.querySelector('#edit-tagline').value;
        const siteConfigDocRef = doc(db, `/artifacts/${appId}/public/data/siteConfig/config`);
        await setDoc(siteConfigDocRef, { title, tagline });
    };

    const handleDeleteAdminPost = async (id) => {
        // Delete post, comments, and likes
        await deleteDoc(doc(db, `/artifacts/${appId}/public/data/adminPosts/${id}`));
        comments.filter(c => c.postId === id).forEach(async c => await deleteDoc(doc(db, `/artifacts/${appId}/public/data/comments/${c.id}`)));
        likes.filter(l => l.postId === id).forEach(async l => await deleteDoc(doc(db, `/artifacts/${appId}/public/data/likes/${l.id}`)));
    };

    const handleUploadMedia = async (e) => {
        e.preventDefault();
        const title = e.target.querySelector('#media-title').value;
        const type = e.target.querySelector('#media-type').value;
        const newMedia = {
            title,
            type,
            url: `https://placehold.co/400x200/52525B/FFFFFF?text=${encodeURIComponent(title)}`,
            timestamp: Date.now()
        };

        await addDoc(collection(db, `/artifacts/${appId}/users/${user.uid}/media`), newMedia);
        e.target.reset();
    };

    const handleDeleteMedia = async (id) => {
        await deleteDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/media/${id}`));
    };
    
    const handleAddComment = async (postId, commentText) => {
        if (commentText.trim() && user && db) {
            await addDoc(collection(db, `/artifacts/${appId}/public/data/comments`), {
                postId,
                userId: user.uid,
                username: user.username,
                text: commentText,
                timestamp: Date.now()
            });
        }
    };
    
    const handleToggleLike = async (postId) => {
        if (!user || !db) return;
        const existingLike = likes.find(l => l.postId === postId && l.userId === user.uid);
        if (existingLike) {
            await deleteDoc(doc(db, `/artifacts/${appId}/public/data/likes/${existingLike.id}`));
        } else {
            await addDoc(collection(db, `/artifacts/${appId}/public/data/likes`), {
                postId,
                userId: user.uid
            });
        }
    };
    
    const handleToggleBan = async (uid, isBanned) => {
        if (db) {
            const userDocRef = doc(db, `/artifacts/${appId}/public/data/users/${uid}`);
            await updateDoc(userDocRef, { isBanned: !isBanned });
        }
    };

    const handleDeleteUser = async (uid) => {
        if (db) {
            const userDocRef = doc(db, `/artifacts/${appId}/public/data/users/${uid}`);
            await deleteDoc(userDocRef);
        }
    };

    const handleProfilePicUpload = async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('profile-pic-file');
        const file = fileInput.files[0];
        if (file && user && db) {
            // In a real app, you would upload the file to Firebase Storage
            // and get a URL. Here, we use a placeholder image.
            const profilePicUrl = `https://placehold.co/200x200/52525B/FFFFFF?text=${user.username.charAt(0)}`;
            const userDocRef = doc(db, `/artifacts/${appId}/public/data/users/${user.uid}`);
            await updateDoc(userDocRef, { profilePicUrl });
        }
    };

    // --- RENDER LOGIC ---
    const renderAdminPosts = (containerId) => {
        const sortedPosts = [...adminPosts].sort((a, b) => b.timestamp - a.timestamp);
        
        return sortedPosts.length === 0 ? (
            <p className="text-gray-400 text-center py-4 col-span-full">No posts yet.</p>
        ) : (
            sortedPosts.map(post => {
                const likeCount = likes.filter(l => l.postId === post.id).length;
                const isLiked = user ? likes.some(l => l.postId === post.id && l.userId === user.uid) : false;
                const postComments = comments.filter(c => c.postId === post.id);

                let mediaElement;
                if (post.type === 'image') {
                    mediaElement = <img src={post.url} alt={post.title} className="w-full h-48 object-cover" />;
                } else if (post.type === 'video') {
                    mediaElement = <video src={post.url} controls className="w-full h-48 object-cover"></video>;
                } else if (post.type === 'audio') {
                    mediaElement = <div className="p-4 flex items-center justify-center h-48 bg-gray-800"><audio src={post.url} controls className="w-full"></audio></div>;
                }

                return (
                    <div key={post.id} className="bg-gray-700 rounded-2xl shadow-lg overflow-hidden flex flex-col">
                        {mediaElement}
                        <div className="p-4 flex-grow">
                            <div className="flex items-center gap-4 mb-4">
                                <img src={ADMIN_PROFILE_PIC_URL} alt="Admin Profile" className="w-10 h-10 rounded-full object-cover" />
                                <div>
                                    <h4 className="text-xl font-bold text-white">{post.title}</h4>
                                    <p className="text-sm text-gray-400">by {ADMIN_CREDENTIALS.username}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <a href={post.url} download={post.filename} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-colors duration-200">
                                    <Download className="w-4 h-4" />
                                    <span>Download</span>
                                </a>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleToggleLike(post.id)}>
                                        <Heart className={`w-5 h-5 ${isLiked ? 'text-red-400' : 'text-gray-400'}`} />
                                    </button>
                                    <span className="text-gray-400">{likeCount}</span>
                                </div>
                            </div>
                            <div className="comments-section mt-4">
                                <h5 className="text-md font-semibold text-gray-300 mb-2">Comments:</h5>
                                <div className="space-y-2 mb-4">
                                    {postComments.length > 0 ? postComments.map(comment => (
                                        <div key={comment.id} className="bg-gray-600 p-2 rounded-xl text-sm mb-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <img src={users.find(u => u.uid === comment.userId)?.profilePicUrl || `https://placehold.co/30x30/52525B/FFFFFF?text=${comment.username.charAt(0)}`} alt={comment.username} className="w-6 h-6 rounded-full object-cover" />
                                                <span className="font-bold text-white">{comment.username}:</span>
                                            </div>
                                            <p className="text-gray-300 ml-8">{comment.text}</p>
                                        </div>
                                    )) : <p className="text-sm text-gray-400">No comments yet.</p>}
                                </div>
                                <form className="comment-form flex gap-2" onSubmit={(e) => {
                                    e.preventDefault();
                                    const commentText = e.target.querySelector('input').value;
                                    handleAddComment(post.id, commentText);
                                    e.target.reset();
                                }}>
                                    <input type="text" placeholder="Add a comment..." className="flex-grow p-2 rounded-xl bg-gray-600 text-white border-none text-sm focus:ring-2 focus:ring-purple-500" required />
                                    <button type="submit" className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-full text-white text-sm font-semibold">Post</button>
                                </form>
                            </div>
                        </div>
                    </div>
                );
            })
        );
    };

    // --- MAIN COMPONENT RETURN ---
    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-white font-inter">
            {/* Navigation Bar */}
            <nav className="fixed top-0 left-0 w-full bg-gray-900 border-b border-gray-700 text-white p-4 z-50 shadow-lg">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">{siteConfig.title}</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setAppState('home')} className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200">
                            <Home className="w-4 h-4" />
                            <span>Home</span>
                        </button>
                        <button onClick={() => setAppState('more-info')} className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200">
                            <Info className="w-4 h-4" />
                            <span>More Info</span>
                        </button>
                        {user?.role === 'visitor' && (
                            <button onClick={() => setAppState('profile')} className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200">
                                <User className="w-4 h-4" />
                                <span>My Profile</span>
                            </button>
                        )}
                        {user?.role === 'admin' && (
                            <button onClick={() => setAppState('admin')} className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200">
                                <Settings className="w-4 h-4" />
                                <span>Admin</span>
                            </button>
                        )}
                        {user ? (
                            <>
                                <span className="text-sm text-gray-400">{user.username}</span>
                                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors duration-200">
                                    <LogOut className="w-4 h-4" />
                                    <span>Logout</span>
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors duration-200">
                                <LogIn className="w-4 h-4" />
                                <span>Login</span>
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="pt-20 flex-grow">
                {/* Home Page Section */}
                {appState === 'home' && (
                    <section id="home-page" className="flex flex-col items-center justify-center min-h-screen p-8">
                        <div className="text-center p-8 bg-gray-800 rounded-2xl shadow-xl max-w-4xl mx-auto">
                            <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">{siteConfig.title}</h1>
                            <p className="text-xl md:text-2xl font-light mb-8 max-w-2xl mx-auto text-gray-300">{siteConfig.tagline}</p>
                            {!user && (
                                <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center mx-auto gap-2 px-8 py-4 text-lg font-semibold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform hover:scale-105 transition-transform duration-300">
                                    <LogIn className="w-5 h-5" />
                                    <span>Login / Register</span>
                                </button>
                            )}
                        </div>
                    </section>
                )}

                {/* More Info Page Section */}
                {appState === 'more-info' && (
                    <section id="more-info-page" className="min-h-screen p-8">
                        <div className="max-w-7xl mx-auto">
                            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8">More About {siteConfig.title}</h2>
                            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl space-y-6 mb-8">
                                <p className="text-gray-300">Vaddzy is a vibrant community designed to connect creative professionals from various fields. Whether you're a music producer, a visual artist, a songwriter, or a designer, our platform provides the tools and space to collaborate and bring ambitious projects to fruition.</p>
                                <p className="text-gray-300">Our mission is to foster a collaborative environment where talent can meet opportunity. You can showcase your work, find a team for your next project, and get inspired by the incredible creations of other members.</p>
                                <p className="text-gray-300">Join us today and become a part of a network that's shaping the future of creative industries.</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Visitor Dashboard Section */}
                {appState === 'visitor' && (
                    <section id="visitor-dashboard" className="min-h-screen p-8">
                        <div className="max-w-7xl mx-auto">
                            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8">
                                Welcome, {user?.username}!
                            </h2>
                            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl mb-8">
                                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-yellow-400">
                                    <Megaphone className="w-6 h-6" />
                                    <span>Global Announcements</span>
                                </h3>
                                <div className="space-y-4">
                                    {announcements.length > 0 ? (
                                        announcements.map(announcement => (
                                            <div key={announcement.id} className="bg-gray-700 p-4 rounded-xl shadow-md text-gray-300">
                                                <p className="font-semibold text-white mb-1">New Announcement</p>
                                                <p>{announcement.text}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-400">No announcements yet.</p>
                                    )}
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl mb-8">
                                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-yellow-400" />
                                    <span>Admin Posts</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {renderAdminPosts('visitor-posts-container')}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Visitor Profile Section */}
                {appState === 'profile' && user?.role === 'visitor' && (
                    <section id="visitor-profile-page" className="min-h-screen p-8">
                        <div className="max-w-7xl mx-auto">
                            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-600 mb-8">My Profile</h2>
                            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl mb-8">
                                <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
                                    <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-purple-500 shadow-lg">
                                        <img src={user.profilePicUrl} alt="Profile Picture" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-grow text-center md:text-left">
                                        <h3 className="text-3xl font-bold text-white mb-2">{user.username}</h3>
                                        <p className="text-gray-400 text-lg">Visitor</p>
                                        <form onSubmit={handleProfilePicUpload} className="mt-4 flex flex-col sm:flex-row items-center gap-4">
                                            <input type="file" id="profile-pic-file" accept="image/*" className="text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                                            <button type="submit" className="px-6 py-2 bg-purple-500 hover:bg-purple-600 rounded-full text-white font-semibold shadow-lg">Upload Picture</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl mb-8">
                                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                                    <Upload className="w-6 h-6 text-purple-400" />
                                    <span>Upload Your Work</span>
                                </h3>
                                <form id="media-upload-form" onSubmit={handleUploadMedia} className="flex flex-col md:flex-row gap-4">
                                    <input id="media-title" type="text" placeholder="Title of your work (e.g., 'My New Song')" className="flex-grow p-3 rounded-xl bg-gray-700 text-white border-none focus:ring-2 focus:ring-purple-500" required />
                                    <select id="media-type" className="p-3 rounded-xl bg-gray-700 text-white border-none focus:ring-2 focus:ring-purple-500">
                                        <option value="image">Image</option>
                                        <option value="video">Video</option>
                                        <option value="audio">Audio</option>
                                    </select>
                                    <button type="submit" className="flex items-center justify-center gap-2 px-8 py-3 font-semibold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform hover:scale-105 transition-transform duration-300">
                                        <span>Upload</span>
                                    </button>
                                </form>
                            </div>
                            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl mb-8">
                                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                                    <Briefcase className="w-6 h-6 text-pink-400" />
                                    <span>My Uploads</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {myMedia.length > 0 ? myMedia.map(item => {
                                        let mediaElement;
                                        if (item.type === 'image') {
                                            mediaElement = <img src={item.url} alt={item.title} className="w-full h-48 object-cover" />;
                                        } else if (item.type === 'video') {
                                            mediaElement = <video src={item.url} controls className="w-full h-48 object-cover"></video>;
                                        } else if (item.type === 'audio') {
                                            mediaElement = <div className="p-4 flex items-center justify-center h-48 bg-gray-800"><audio src={item.url} controls className="w-full"></audio></div>;
                                        }
                                        return (
                                            <div key={item.id} className="bg-gray-700 rounded-xl shadow-lg overflow-hidden">
                                                {mediaElement}
                                                <div className="p-4">
                                                    <h4 className="text-xl font-bold text-white mb-2">{item.title}</h4>
                                                    <button onClick={() => handleDeleteMedia(item.id)} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors duration-200">
                                                        <Trash className="w-4 h-4" />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <p className="text-gray-400 text-center py-4 col-span-full">No uploads yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Admin Dashboard Section */}
                {appState === 'admin' && user?.role === 'admin' && (
                    <section id="admin-dashboard" className="min-h-screen p-8">
                        <div className="max-w-7xl mx-auto">
                            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-500 mb-8">Admin Dashboard</h2>

                            {/* Social Activity Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="text-gray-400 font-semibold">Total Visitors</div>
                                        <Users className="w-8 h-8 text-green-400" />
                                    </div>
                                    <div className="text-3xl font-bold mt-2">{users.length}</div>
                                </div>
                                <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="text-gray-400 font-semibold">Admin Posts</div>
                                        <Sparkles className="w-8 h-8 text-teal-400" />
                                    </div>
                                    <div className="text-3xl font-bold mt-2">{adminPosts.length}</div>
                                </div>
                                <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="text-gray-400 font-semibold">Total Comments</div>
                                        <MessageCircle className="w-8 h-8 text-yellow-400" />
                                    </div>
                                    <div className="text-3xl font-bold mt-2">{comments.length}</div>
                                </div>
                                <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="text-gray-400 font-semibold">Total Likes</div>
                                        <Heart className="w-8 h-8 text-red-400" />
                                    </div>
                                    <div className="text-3xl font-bold mt-2">{likes.length}</div>
                                </div>
                            </div>
                            
                            {/* Announcements Section */}
                            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl mb-8">
                                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-white">
                                    <Megaphone className="w-6 h-6 text-yellow-400" />
                                    <span>Manage Announcements</span>
                                </h3>
                                <form onSubmit={handleAddAnnouncement} className="flex flex-col gap-4">
                                    <textarea id="admin-announcement-text" placeholder="Write a new global announcement..." className="p-3 rounded-xl bg-gray-700 text-white border-none focus:ring-2 focus:ring-green-500 h-24" required></textarea>
                                    <button type="submit" className="flex items-center justify-center gap-2 px-8 py-3 font-semibold rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transform hover:scale-105 transition-transform duration-300">
                                        <span>Post Announcement</span>
                                    </button>
                                </form>
                                <div className="mt-8 space-y-4">
                                    {announcements.length > 0 ? announcements.map(announcement => (
                                        <div key={announcement.id} className="bg-gray-700 p-4 rounded-xl flex justify-between items-center">
                                            <p className="text-gray-300 text-sm font-semibold">{announcement.text}</p>
                                            <button onClick={() => handleDeleteAnnouncement(announcement.id)} className="remove-announcement-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">Remove</button>
                                        </div>
                                    )) : (
                                        <p className="text-gray-400 text-center py-4">No announcements yet.</p>
                                    )}
                                </div>
                            </div>

                            {/* Admin Posts Section */}
                            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl mb-8">
                                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-white">
                                    <Sparkles className="w-6 h-6 text-yellow-400" />
                                    <span>Post New Content</span>
                                </h3>
                                <form onSubmit={handlePostAdminContent} className="flex flex-col gap-4">
                                    <input id="admin-post-title" type="text" placeholder="Title for your post" className="p-3 rounded-xl bg-gray-700 text-white border-none focus:ring-2 focus:ring-green-500" required />
                                    <input id="admin-post-file" type="file" className="p-3 rounded-xl bg-gray-700 text-white border-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" required />
                                    <button type="submit" className="flex items-center justify-center gap-2 px-8 py-3 font-semibold rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transform hover:scale-105 transition-transform duration-300">
                                        <span>Post Content</span>
                                    </button>
                                </form>
                                <div className="mt-8 space-y-4">
                                    {adminPosts.length > 0 ? adminPosts.map(post => (
                                        <div key={post.id} className="bg-gray-700 p-4 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-lg text-white">{post.title}</p>
                                                <p className="text-sm text-gray-400">Type: {post.type}</p>
                                            </div>
                                            <button onClick={() => handleDeleteAdminPost(post.id)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200">Remove</button>
                                        </div>
                                    )) : (
                                        <p className="text-gray-400 text-center py-4">No posts yet.</p>
                                    )}
                                </div>
                            </div>

                            {/* User Management */}
                            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl mb-8">
                                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-white">
                                    <Users className="w-6 h-6 text-green-400" />
                                    <span>User Management</span>
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-700">
                                        <thead>
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Username</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-gray-700 divide-y divide-gray-600">
                                            {users.length > 0 ? users.filter(u => u.role !== 'admin').map(visitor => (
                                                <tr key={visitor.uid} className="hover:bg-gray-600 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-medium text-white">{visitor.username}</td>
                                                    <td className="px-6 py-4 text-sm">
                                                        {visitor.isBanned ? <span className="text-red-400 font-bold">Banned</span> : <span className="text-green-400">Active</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium flex gap-2">
                                                        <button onClick={() => handleToggleBan(visitor.uid, visitor.isBanned)} className={`text-white px-3 py-1 rounded-full text-xs font-semibold ${visitor.isBanned ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}>
                                                            {visitor.isBanned ? 'Unban' : 'Ban'}
                                                        </button>
                                                        <button onClick={() => handleDeleteUser(visitor.uid)} className="text-red-400 hover:text-red-300 transition-colors">
                                                            <Trash className="w-4 h-4 inline-block mr-1" />
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr className="text-center"><td colSpan="3" className="px-6 py-4 text-gray-400">No visitors registered yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* Comment Management */}
                            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl mb-8">
                                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-white">
                                    <MessageCircle className="w-6 h-6 text-yellow-400" />
                                    <span>Comment Management</span>
                                </h3>
                                <ul className="space-y-4">
                                    {comments.length > 0 ? comments.map(comment => {
                                        const postTitle = adminPosts.find(p => p.id === comment.postId)?.title || 'Deleted Post';
                                        return (
                                            <li key={comment.id} className="bg-gray-700 p-4 rounded-xl flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-white">{comment.username} on "{postTitle}":</p>
                                                    <p className="text-gray-300 text-sm mt-1">{comment.text}</p>
                                                </div>
                                                <button onClick={() => deleteDoc(doc(db, `/artifacts/${appId}/public/data/comments/${comment.id}`))} className="ml-4 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200">Delete</button>
                                            </li>
                                        );
                                    }) : (
                                        <li className="text-gray-400 text-center py-4">No comments yet.</li>
                                    )}
                                </ul>
                            </div>
                            
                            {/* Site Settings */}
                            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl mb-8">
                                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-white">
                                    <Settings className="w-6 h-6 text-teal-400" />
                                    <span>Site Settings</span>
                                </h3>
                                <form onSubmit={handleUpdateSiteConfig} className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Main Title</label>
                                        <input id="edit-title" type="text" defaultValue={siteConfig.title} className="w-full p-3 rounded-xl bg-gray-700 text-white border-none focus:ring-2 focus:ring-green-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Tagline</label>
                                        <textarea id="edit-tagline" defaultValue={siteConfig.tagline} className="w-full p-3 rounded-xl bg-gray-700 text-white border-none focus:ring-2 focus:ring-green-500 h-24"></textarea>
                                    </div>
                                    <button type="submit" className="flex items-center justify-center gap-2 px-8 py-3 font-semibold rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transform hover:scale-105 transition-transform duration-300">
                                        <span>Save Changes</span>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {/* Login/Register Modal */}
            {isModalOpen && (
                <div id="auth-modal" className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[100]">
                    <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md w-full relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                        {!isRegistering ? (
                            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                <h2 className="text-3xl font-bold mb-2 text-white text-center">Login</h2>
                                <input id="login-username" type="text" placeholder="Username" className="p-3 rounded-xl bg-gray-700 text-white border-none focus:ring-2 focus:ring-purple-500" required />
                                <input id="login-password" type="password" placeholder="Password" className="p-3 rounded-xl bg-gray-700 text-white border-none focus:ring-2 focus:ring-purple-500" required />
                                <button type="submit" disabled={loading} className="px-8 py-4 text-lg font-semibold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform hover:scale-105 transition-transform duration-300">
                                    {loading ? 'Logging in...' : 'Log In'}
                                </button>
                                {loginError && <p className="text-red-400 text-center">{loginError}</p>}
                                <p className="text-sm text-gray-400 text-center mt-2">Don't have an account? <span onClick={() => setIsRegistering(true)} className="text-purple-400 cursor-pointer hover:underline">Register here.</span></p>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} className="flex flex-col gap-4">
                                <h2 className="text-3xl font-bold mb-2 text-white text-center">Registration</h2>
                                <input id="register-username" type="text" placeholder="Username" className="p-3 rounded-xl bg-gray-700 text-white border-none focus:ring-2 focus:ring-purple-500" required />
                                <input id="register-password" type="password" placeholder="Password" className="p-3 rounded-xl bg-gray-700 text-white border-none focus:ring-2 focus:ring-purple-500" required />
                                <button type="submit" disabled={loading} className="px-8 py-4 text-lg font-semibold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform hover:scale-105 transition-transform duration-300">
                                    {loading ? 'Registering...' : 'Register'}
                                </button>
                                {registerError && <p className="text-red-400 text-center">{registerError}</p>}
                                <p className="text-sm text-gray-400 text-center mt-2">Already have an account? <span onClick={() => setIsRegistering(false)} className="text-purple-400 cursor-pointer hover:underline">Log in.</span></p>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Footer Section */}
            <footer className="mt-auto bg-gray-950 p-8 border-t border-gray-700 shadow-inner">
                <div className="max-w-7xl mx-auto text-center">
                    <h3 className="text-2xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-600">Contact & Social Media</h3>
                    <div className="flex justify-center flex-wrap gap-6 mb-6">
                        <a href="https://www.facebook.com/profile.php?id=61562834675406" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500 transition-colors duration-200 flex items-center gap-2">
                            <Facebook className="w-6 h-6" />
                            <span>Facebook</span>
                        </a>
                        <a href="https://www.instagram.com/vaddzy35?igsh=a3d2dXZ5OW9ia216" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-pink-500 transition-colors duration-200 flex items-center gap-2">
                            <Instagram className="w-6 h-6" />
                            <span>Instagram</span>
                        </a>
                        <a href="https://www.youtube.com/@vaddzy" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-red-500 transition-colors duration-200 flex items-center gap-2">
                            <Youtube className="w-6 h-6" />
                            <span>YouTube</span>
                        </a>
                        <a href="https://tiktok.com/@vaddzy7" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path d="M12.525 0h-2.102v8.528h2.102V0zm-2.102 12.062V24h2.102v-5.28c2.955-1.127 5.093-4.225 5.093-7.854 0-4.836-3.921-8.757-8.757-8.757H0V11.238h4.526C4.423 15.353 7.747 18.78 12.062 18.883v5.117h2.102V12.062h-2.102z"/>
                            </svg>
                            <span>TikTok</span>
                        </a>
                        <a href="tel:+250736421989" className="text-gray-300 hover:text-green-500 transition-colors duration-200 flex items-center gap-2">
                            <PhoneCall className="w-6 h-6" />
                            <span>WhatsApp: +250 736 421 989</span>
                        </a>
                    </div>
                    <p className="text-gray-400 mt-4">&copy; 2025 Vaddzy. All rights reserved.</p>
                    <p className="text-gray-400 text-sm mt-1">Developed by MANIRAFASHA Gaston</p>
                </div>
            </footer>
        </div>
    );
}

export default App;
