// App.jsx
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQvr257MnUMdv-i4VkgjaGUPnSho3F_x0",
  authDomain: "minehead-badminton-tournament.firebaseapp.com",
  projectId: "minehead-badminton-tournament",
  storageBucket: "minehead-badminton-tournament.firebasestorage.app",
  messagingSenderId: "237720155580",
  appId: "1:237720155580:web:8faed76ef425f262d727b9",
  measurementId: "G-RG7J53MLE2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Mock Stripe integration
const processPayment = (amount) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, paymentId: 'pi_' + Math.random().toString(36).substr(2, 9) });
    }, 1500);
  });
};

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Player registration state
  const [playerData, setPlayerData] = useState({
    name: '',
    email: '',
    phone: '',
    category: ''
  });
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Admin state
  const [adminData, setAdminData] = useState({
    email: '',
    password: ''
  });
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [fixtures, setFixtures] = useState({ singles: [], doubles: [] });
  
  // Tournament data
  const [players, setPlayers] = useState({ singles: [], doubles: [] });
  
  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    
    // Load initial data
    loadTournamentData();
    
    return unsubscribe;
  }, []);
  
  const loadTournamentData = async () => {
    try {
      // Load registration status
      const configDoc = await getDocs(collection(db, 'config'));
      if (!configDoc.empty) {
        const data = configDoc.docs[0].data();
        setRegistrationOpen(data.registrationOpen || true);
      }
      
      // Load players
      const playersSnapshot = await getDocs(collection(db, 'players'));
      const singlesPlayers = [];
      const doublesPlayers = [];
      
      playersSnapshot.forEach((doc) => {
        const player = doc.data();
        if (player.category === 'singles' || player.category === 'both') {
          singlesPlayers.push(player);
        }
        if (player.category === 'doubles' || player.category === 'both') {
          doublesPlayers.push(player);
        }
      });
      
      setPlayers({ singles: singlesPlayers, doubles: doublesPlayers });
      
      // Load fixtures
      const fixturesSnapshot = await getDocs(collection(db, 'fixtures'));
      const singlesFixtures = [];
      const doublesFixtures = [];
      
      fixturesSnapshot.forEach((doc) => {
        const fixture = doc.data();
        if (fixture.type === 'singles') {
          singlesFixtures.push(fixture);
        } else {
          doublesFixtures.push(fixture);
        }
      });
      
      setFixtures({ singles: singlesFixtures, doubles: doublesFixtures });
    } catch (error) {
      console.error('Error loading ', error);
    }
  };
  
  const handleCategoryChange = (category) => {
    setPlayerData({ ...playerData, category });
    
    switch (category) {
      case 'singles':
      case 'doubles':
        setPaymentAmount(5);
        break;
      case 'both':
        setPaymentAmount(10);
        break;
      default:
        setPaymentAmount(0);
    }
  };
  
  const handleRegister = async () => {
    if (!playerData.name || !playerData.email || !playerData.phone || !playerData.category) {
      alert('Please fill all fields');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Process payment
      const paymentResult = await processPayment(paymentAmount);
      
      if (paymentResult.success) {
        // Save player to Firestore
        await addDoc(collection(db, 'players'), {
          ...playerData,
          paymentId: paymentResult.paymentId,
          registeredAt: new Date()
        });
        
        alert('Registration successful!');
        setPlayerData({ name: '', email: '', phone: '', category: '' });
        setPaymentAmount(0);
        
        // Reload data
        loadTournamentData();
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, adminData.email, adminData.password);
      setCurrentPage('admin');
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };
  
  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
      setCurrentPage('home');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const toggleRegistration = async () => {
    try {
      const configRef = doc(db, 'config', 'settings');
      await updateDoc(configRef, { registrationOpen: !registrationOpen });
      setRegistrationOpen(!registrationOpen);
    } catch (error) {
      console.error('Error updating registration status:', error);
    }
  };
  
  const generateFixtures = () => {
    // Generate random fixtures for singles
    const singlesPlayers = [...players.singles];
    const shuffledSingles = singlesPlayers.sort(() => 0.5 - Math.random());
    const singlesFixtures = [];
    
    for (let i = 0; i < shuffledSingles.length; i += 2) {
      if (i + 1 < shuffledSingles.length) {
        singlesFixtures.push({
          id: `singles-${i/2 + 1}`,
          player1: shuffledSingles[i].name,
          player2: shuffledSingles[i + 1].name,
          winner: null,
          round: 'Quarterfinal'
        });
      }
    }
    
    // Generate random fixtures for doubles
    const doublesPlayers = [...players.doubles];
    const shuffledDoubles = doublesPlayers.sort(() => 0.5 - Math.random());
    const doublesFixtures = [];
    
    for (let i = 0; i < shuffledDoubles.length; i += 2) {
      if (i + 1 < shuffledDoubles.length) {
        doublesFixtures.push({
          id: `doubles-${i/2 + 1}`,
          player1: shuffledDoubles[i].name,
          player2: shuffledDoubles[i + 1].name,
          winner: null,
          round: 'Quarterfinal'
        });
      }
    }
    
    setFixtures({ singles: singlesFixtures, doubles: doublesFixtures });
    
    // Save to Firestore
    singlesFixtures.forEach(fixture => {
      addDoc(collection(db, 'fixtures'), { ...fixture, type: 'singles' });
    });
    
    doublesFixtures.forEach(fixture => {
      addDoc(collection(db, 'fixtures'), { ...fixture, type: 'doubles' });
    });
    
    // Close registration
    toggleRegistration();
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl font-semibold">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img src="badmintonlogo.png" alt="Tournament Logo" className="h-12 w-12" />
            <h1 className="text-2xl font-bold text-gray-800">Minehead Badminton Tournament</h1>
          </div>
          
          <nav className="hidden md:flex space-x-6">
            <button 
              onClick={() => setCurrentPage('home')} 
              className={`px-3 py-2 rounded-md ${currentPage === 'home' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Home
            </button>
            <button 
              onClick={() => setCurrentPage('fixtures')} 
              className={`px-3 py-2 rounded-md ${currentPage === 'fixtures' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Fixtures
            </button>
            {!user ? (
              <button 
                onClick={() => setCurrentPage('login')} 
                className="px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Admin Login
              </button>
            ) : (
              <button 
                onClick={handleAdminLogout} 
                className="px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Logout
              </button>
            )}
          </nav>
          
          {/* Mobile menu button */}
          <button className="md:hidden text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {/* Home Page */}
        {currentPage === 'home' && (
          <div className="space-y-12">
            {/* Hero Section */}
            <section className="text-center py-12 bg-white rounded-xl shadow-lg">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Minehead Badminton Tournament 2023</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Join the most exciting badminton tournament in Minehead. Compete in singles and doubles categories!
              </p>
              <div className="mt-8">
                <button 
                  onClick={() => setCurrentPage('register')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition duration-300 transform hover:scale-105"
                >
                  Register Now
                </button>
              </div>
            </section>
            
            {/* Tournament Info */}
            <section className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-blue-600 text-3xl mb-4">🏸</div>
                <h3 className="text-xl font-semibold mb-2">Singles Tournament</h3>
                <p className="text-gray-600">Compete individually in our singles category. Show your skills and win exciting prizes!</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-green-600 text-3xl mb-4">🏸</div>
                <h3 className="text-xl font-semibold mb-2">Doubles Tournament</h3>
                <p className="text-gray-600">Team up with a partner and showcase your teamwork in our doubles category.</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="text-purple-600 text-3xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold mb-2">Prizes & Awards</h3>
                <p className="text-gray-600">Exciting prizes for winners in both categories. Trophies and cash prizes up for grabs!</p>
              </div>
            </section>
            
            {/* Registration Status */}
            <section className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Tournament Status</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-center">Singles Players</h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {players.singles.length > 0 ? (
                      <ul className="space-y-2">
                        {players.singles.map((player, index) => (
                          <li key={index} className="flex items-center p-2 bg-white rounded shadow-sm">
                            <span className="mr-2">🏸</span>
                            <span>{player.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No players registered yet</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-center">Doubles Players</h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {players.doubles.length > 0 ? (
                      <ul className="space-y-2">
                        {players.doubles.map((player, index) => (
                          <li key={index} className="flex items-center p-2 bg-white rounded shadow-sm">
                            <span className="mr-2">🏸</span>
                            <span>{player.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No players registered yet</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
        
        {/* Registration Page */}
        {currentPage === 'register' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Player Registration</h2>
            
            {!registrationOpen ? (
              <div className="text-center py-8">
                <div className="text-2xl font-semibold text-red-600 mb-4">Registration is now closed</div>
                <p className="text-gray-600">The tournament fixtures have been generated. Please check the fixtures page.</p>
              </div>
            ) : (
              <form className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    value={playerData.name}
                    onChange={(e) => setPlayerData({...playerData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Email Address</label>
                  <input
                    type="email"
                    value={playerData.email}
                    onChange={(e) => setPlayerData({...playerData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={playerData.phone}
                    onChange={(e) => setPlayerData({...playerData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Category</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => handleCategoryChange('singles')}
                      className={`p-4 border rounded-lg transition-all ${
                        playerData.category === 'singles' 
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-semibold">Singles</div>
                      <div className="text-sm text-gray-600">£5</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleCategoryChange('doubles')}
                      className={`p-4 border rounded-lg transition-all ${
                        playerData.category === 'doubles' 
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-200' 
                          : 'border-gray-300 hover:border-green-300'
                      }`}
                    >
                      <div className="font-semibold">Doubles</div>
                      <div className="text-sm text-gray-600">£5</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleCategoryChange('both')}
                      className={`p-4 border rounded-lg transition-all ${
                        playerData.category === 'both' 
                          ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                          : 'border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-semibold">Both</div>
                      <div className="text-sm text-gray-600">£10</div>
                    </button>
                  </div>
                </div>
                
                {playerData.category && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Registration Fee</div>
                        <div className="text-sm text-gray-600">Selected: {playerData.category}</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">£{paymentAmount}</div>
                    </div>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={!playerData.category || isProcessing}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition duration-300 ${
                    !playerData.category || isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isProcessing ? 'Processing Payment...' : 'Pay & Register'}
                </button>
              </form>
            )}
          </div>
        )}
        
        {/* Fixtures Page */}
        {currentPage === 'fixtures' && (
          <div className="space-y-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Tournament Fixtures</h2>
              <p className="text-gray-600">Check the latest matchups and tournament progress</p>
            </div>
            
            {fixtures.singles.length === 0 && fixtures.doubles.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <div className="text-2xl font-semibold text-gray-600 mb-2">Fixtures Not Generated Yet</div>
                <p className="text-gray-500">Please check back later when the tournament fixtures are ready.</p>
              </div>
            ) : (
              <>
                {/* Singles Fixtures */}
                <section className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <span className="mr-2">🏸</span> Singles Tournament
                  </h3>
                  
                  {fixtures.singles.length > 0 ? (
                    <div className="space-y-4">
                      {fixtures.singles.map((fixture, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div className="font-medium">{fixture.round}</div>
                            <div className="text-sm text-gray-500">Match {index + 1}</div>
                          </div>
                          
                          <div className="mt-3 flex justify-between items-center">
                            <div className="text-center">
                              <div className={`font-medium ${fixture.winner === fixture.player1 ? 'text-green-600 font-bold' : ''}`}>
                                {fixture.player1}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Player 1</div>
                            </div>
                            
                            <div className="text-gray-400">VS</div>
                            
                            <div className="text-center">
                              <div className={`font-medium ${fixture.winner === fixture.player2 ? 'text-green-600 font-bold' : ''}`}>
                                {fixture.player2}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Player 2</div>
                            </div>
                          </div>
                          
                          {fixture.winner && (
                            <div className="mt-3 text-center text-green-600 font-medium">
                              Winner: {fixture.winner}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No singles fixtures generated yet
                    </div>
                  )}
                </section>
                
                {/* Doubles Fixtures */}
                <section className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <span className="mr-2">🏸</span> Doubles Tournament
                  </h3>
                  
                  {fixtures.doubles.length > 0 ? (
                    <div className="space-y-4">
                      {fixtures.doubles.map((fixture, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div className="font-medium">{fixture.round}</div>
                            <div className="text-sm text-gray-500">Match {index + 1}</div>
                          </div>
                          
                          <div className="mt-3 flex justify-between items-center">
                            <div className="text-center">
                              <div className={`font-medium ${fixture.winner === fixture.player1 ? 'text-green-600 font-bold' : ''}`}>
                                {fixture.player1}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Player 1</div>
                            </div>
                            
                            <div className="text-gray-400">VS</div>
                            
                            <div className="text-center">
                              <div className={`font-medium ${fixture.winner === fixture.player2 ? 'text-green-600 font-bold' : ''}`}>
                                {fixture.player2}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Player 2</div>
                            </div>
                          </div>
                          
                          {fixture.winner && (
                            <div className="mt-3 text-center text-green-600 font-medium">
                              Winner: {fixture.winner}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No doubles fixtures generated yet
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
        
        {/* Admin Login Page */}
        {currentPage === 'login' && !user && (
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Admin Login</h2>
            
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData({...adminData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={adminData.password}
                  onChange={(e) => setAdminData({...adminData, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-300"
              >
                Login
              </button>
            </form>
          </div>
        )}
        
        {/* Admin Dashboard */}
        {currentPage === 'admin' && user && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-800">Admin Dashboard</h2>
              <button
                onClick={handleAdminLogout}
                className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-300"
              >
                Logout
              </button>
            </div>
            
            {/* Registration Control */}
            <section className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Registration Control</h3>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Registration Status</div>
                  <div className="text-sm text-gray-600">
                    {registrationOpen ? 'Open for new players' : 'Closed - Fixtures generated'}
                  </div>
                </div>
                
                <button
                  onClick={toggleRegistration}
                  className={`py-2 px-6 rounded-lg font-medium ${
                    registrationOpen 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {registrationOpen ? 'Close Registration' : 'Open Registration'}
                </button>
              </div>
              
              {!registrationOpen && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="font-medium text-yellow-800">Registration is closed</div>
                  <div className="text-sm text-yellow-700">
                    Fixtures have been generated. Players can no longer register.
                  </div>
                </div>
              )}
            </section>
            
            {/* Generate Fixtures */}
            <section className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Tournament Management</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-lg mb-2">Player Statistics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Singles Players:</span>
                      <span className="font-medium">{players.singles.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Doubles Players:</span>
                      <span className="font-medium">{players.doubles.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Registrations:</span>
                      <span className="font-medium">{players.singles.length + players.doubles.length}</span>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-lg mb-2">Fixture Generation</h4>
                  <button
                    onClick={generateFixtures}
                    disabled={!registrationOpen || players.singles.length < 2}
                    className={`w-full py-2 px-4 rounded-lg font-medium ${
                      !registrationOpen || players.singles.length < 2
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    Generate Fixtures
                  </button>
                  {!registrationOpen && (
                    <p className="text-sm text-gray-500 mt-2">Fixtures already generated</p>
                  )}
                  {players.singles.length < 2 && (
                    <p className="text-sm text-gray-500 mt-2">Need at least 2 players to generate fixtures</p>
                  )}
                </div>
              </div>
            </section>
            
            {/* Player Lists */}
            <section className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Registered Players</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Singles Players ({players.singles.length})</h4>
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {players.singles.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {players.singles.map((player, index) => (
                          <li key={index} className="p-3 hover:bg-gray-50">
                            <div className="font-medium">{player.name}</div>
                            <div className="text-sm text-gray-600">{player.email}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-gray-500">No singles players registered</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Doubles Players ({players.doubles.length})</h4>
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {players.doubles.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {players.doubles.map((player, index) => (
                          <li key={index} className="p-3 hover:bg-gray-50">
                            <div className="font-medium">{player.name}</div>
                            <div className="text-sm text-gray-600">{player.email}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-gray-500">No doubles players registered</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p>© 2023 Minehead Badminton Tournament. All rights reserved.</p>
          <p className="mt-2 text-gray-400">For inquiries, contact: info@mineheadbadminton.com</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
