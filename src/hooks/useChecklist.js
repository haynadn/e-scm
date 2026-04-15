import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

export function useChecklist() {
  const [session, setSession] = useState({
    token: localStorage.getItem('app_token') || null,
    role: localStorage.getItem('app_role') || null,
    username: localStorage.getItem('app_username') || null
  });
  
  const [data, setData] = useState({
    locations: [],
    masterItems: [],
    checklists: {}
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const performLogout = useCallback(() => {
    localStorage.removeItem('app_token');
    localStorage.removeItem('app_role');
    localStorage.removeItem('app_username');
    setSession({ token: null, role: null, username: null });
    setData({ locations: [], masterItems: [], checklists: {} });
    setIsLoaded(true);
  }, []);

  const loginSuccess = (token, role, username) => {
    localStorage.setItem('app_token', token);
    localStorage.setItem('app_role', role);
    localStorage.setItem('app_username', username);
    setSession({ token, role, username });
    loadOnlineData(token);
  };

  const loadOnlineData = useCallback(async (tokenToUse) => {
    const token = tokenToUse || session.token;
    if (!token) {
      setIsLoaded(true);
      return;
    }
    
    setIsLoaded(false);
    try {
      const res = await fetch(`${API_BASE_URL}/data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401 || res.status === 403) {
        performLogout();
        return;
      }
      if (!res.ok) throw new Error('Network response was not ok');
      const apiData = await res.json();
      setData({
        locations: apiData.locations || [],
        masterItems: apiData.masterItems || [],
        checklists: apiData.checklists || {}
      });
    } catch (err) {
      console.error("Failed loading remote data", err);
      alert("Gagal menarik data dari server.");
    } finally {
      setIsLoaded(true);
    }
  }, [session.token, performLogout]);

  // Initial mount load
  useEffect(() => {
    loadOnlineData();
  }, [loadOnlineData]);

  const importMasterData = async (newLocations, newItems) => {
    try {
      const res = await fetch(`${API_BASE_URL}/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ locations: newLocations, masterItems: newItems })
      });
      if(res.ok) {
        // Optimistically update or reload
        await loadOnlineData();
        return true;
      }
      return false;
    } catch(err) {
       console.error(err);
       return false;
    }
  };

  const clearAllData = async () => {
    if(window.confirm('Are you sure you want to WIPE the central database? This affects everyone.')){
      try {
        const res = await fetch(`${API_BASE_URL}/clear`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.token}` }
        });
        if(res.ok) {
          setData({ locations: [], masterItems: [], checklists: {} });
        }
      } catch(err) {
        console.error(err);
      }
    }
  };

  const saveChecklist = async (locationId, itemsData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/locations/${locationId}/checklist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        // itemsData might contain big base64 strings, standard express limit handled this.
        body: JSON.stringify({ items: itemsData })
      });
      
      if(res.ok) {
        await loadOnlineData(); // Reload safely to get the actual uploaded image URL paths
        return true;
      } else {
        alert("Gagal menyimpan ke server");
        return false;
      }
    } catch(err) {
      console.error(err);
      alert("Network Error");
      return false;
    }
  };

  const getStats = () => {
    let completedLocations = 0;
    let totalItemsChecked = 0;
    let matchingItems = 0;
    let nonMatchingItems = 0;

    const safeLocations = data.locations || [];
    const safeMasterItems = data.masterItems || [];

    safeLocations.forEach(loc => {
      if (loc.isCompleted) {
        completedLocations++;
        const locChecklist = data.checklists[loc.id] || [];
        
        locChecklist.forEach(chk => {
          totalItemsChecked++;
          const master = safeMasterItems.find(m => m.id === chk.idItem);
          const actualQty = parseInt(chk.jumlahAktual);
          if (master && actualQty === parseInt(master.standardQty)) {
            matchingItems++;
          } else {
            nonMatchingItems++;
          }
        });
      }
    });

    return {
      totalLocations: safeLocations.length,
      completedLocations,
      remainingLocations: safeLocations.length - completedLocations,
      totalItemsChecked,
      matchingItems,
      nonMatchingItems
    };
  };

  return {
    isLoaded,
    session,
    loginSuccess,
    performLogout,
    locations: data.locations || [],
    masterItems: data.masterItems || [],
    checklists: data.checklists || {},
    saveChecklist,
    getStats,
    importMasterData,
    clearAllData
  };
}
