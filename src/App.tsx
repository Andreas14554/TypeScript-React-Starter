import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CircleOff, CircleDot, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Supabase-Client initialisieren
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type Workshop = {
  id: string;
  name: string;
  address: string;
  capacity_status: 'available' | 'busy' | 'full';
  image: string;
};

function App() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null); // Loggierter Benutzer
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // Zum Navigieren zur Detailseite

  useEffect(() => {
    loadWorkshops();

    // Echtzeit-Updates abonnieren
    const channel = supabase
      .channel('workshops_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'workshops' },
        () => {
          loadWorkshops();
        }
      )
      .subscribe();

    // Benutzerinformation abrufen
    const session = supabase.auth.session();
    setUser(session?.user || null);

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadWorkshops = async () => {
    const { data, error } = await supabase
      .from('workshops')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error loading workshops:', error);
      return;
    }
    
    setWorkshops(data || []);
  };

  const updateCapacityStatus = async (workshopId: string, status: Workshop['capacity_status']) => {
    const { error } = await supabase
      .from('workshops')
      .update({ capacity_status: status })
      .eq('id', workshopId);

    if (error) {
      console.error('Error updating status:', error);
      return;
    }

    setSelectedWorkshop(null);
  };

  const getStatusIcon = (status: Workshop['capacity_status']) => {
    switch (status) {
      case 'available':
        return <CircleDot className="text-green-500" />;
      case 'busy':
        return <Activity className="text-yellow-500" />;
      case 'full':
        return <CircleOff className="text-red-500" />;
      default:
        return <CircleDot className="text-green-500" />; // Default to available
    }
  };

  const getStatusText = (status: Workshop['capacity_status']) => {
    switch (status) {
      case 'available':
        return 'Verfügbar';
      case 'busy':
        return 'Stark ausgelastet';
      case 'full':
        return 'Keine Kapazität';
      default:
        return 'Verfügbar'; // Default to available
    }
  };

  const handleSignUp = async () => {
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      console.error('Error signing up:', error.message);
    } else {
      setUser(user);
      alert('Registrierung erfolgreich!');
    }
  };

  const handleSignIn = async () => {
    const { user, error } = await supabase.auth.signIn({
      email,
      password,
    });
    if (error) {
      console.error('Error signing in:', error.message);
    } else {
      setUser(user);
      alert('Anmeldung erfolgreich!');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const navigateToWorkshopDetail = (id: string) => {
    navigate(`/workshop/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Werkstattverzeichnis</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {!user ? (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold">Bitte anmelden oder registrieren</h2>
            <div className="mt-4">
              <input
                type="email"
                placeholder="E-Mail"
                className="px-3 py-2 border rounded"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Passwort"
                className="px-3 py-2 border rounded mt-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                onClick={handleSignUp}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              >
                Registrieren
              </button>
              <button
                onClick={handleSignIn}
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
              >
                Anmelden
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {workshops.map((workshop) => (
                <div
                  key={workshop.id}
                  className="bg-white overflow-hidden shadow rounded-lg"
                  onClick={() => navigateToWorkshopDetail(workshop.id)}
                >
                  <img
                    src={workshop.image || 'https://images.unsplash.com/photo-1449130015084-2d48a345ae62'}
                    alt={workshop.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">{workshop.name}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Verhindert das Öffnen der Detailseite
                          setSelectedWorkshop(workshop.id);
                        }}
                        className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
                      >
                        {getStatusIcon(workshop.capacity_status)}
                        <span className="text-sm text-gray-700">
                          {getStatusText(workshop.capacity_status)}
                        </span>
                      </button>
                    </div>
                    <p className="text-gray-600">{workshop.address}</p>
                  </div>

                  {selectedWorkshop === workshop.id && (
                    <div className="px-6 pb-6">
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Status aktualisieren:
                        </h4>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateCapacityStatus(workshop.id, 'available')}
                            className="flex-1 px-3 py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                          >
                            Verfügbar
                          </button>
                          <button
                            onClick={() => updateCapacityStatus(workshop.id, 'busy')}
                            className="flex-1 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
                          >
                            Ausgelastet
                          </button>
                          <button
                            onClick={() => updateCapacityStatus(workshop.id, 'full')}
                            className="flex-1 px-3 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                          >
                            Voll
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
3. Werkstatt Detailseite
Für die detaillierte Werkstattansicht kannst du react-router-dom verwenden, um die Seite zu navigieren. Du musst eine Route hinzufügen, die die Detailseite darstellt.

Erstelle die Datei WorkshopDetail.tsx:

tsx
Kopieren
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const WorkshopDetail = () => {
  const { id } = useParams();
  const [workshop, setWorkshop] = useState<any>(null);

  useEffect(() => {
    const fetchWorkshop = async () => {
      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching workshop:', error.message);
      } else {
        setWorkshop(data);
      }
    };

    if (id) {
      fetchWorkshop();
    }
  }, [id]);

  if (!workshop) {
    return <div>Lädt...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-semibold">{workshop.name}</h2>
      <img
        src={workshop.image || 'https://images.unsplash.com/photo-1449130015084-2d48a345ae62'}
        alt={workshop.name}
        className="w-full h-72 object-cover mt-4"
      />
      <p className="mt-4">{workshop.address}</p>
      <p className="mt-2">Status: {workshop.capacity_status}</p>
    </div>
  );
};

export default WorkshopDetail;
4. App-Routing einrichten
Füge Routen hinzu, um zwischen der Liste der Werkstätten und der Detailansicht zu navigieren. Bearbeite main.tsx oder App.tsx und stelle sicher, dass du den Router konfigurierst.

tsx
Kopieren
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import App from './App';
import WorkshopDetail from './WorkshopDetail';

function Main() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/workshop/:id" element={<WorkshopDetail />} />
      </Routes>
    </Router>
  );
}

export default Main;
