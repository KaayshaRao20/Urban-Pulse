import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';
import { API_BASE } from '../config/api';

// Popular Bengaluru landmark locations for instant geocode matching
const BENGALURU_PRESET_LOCATIONS = [
  { name: 'Kadubeesanahalli Bridge, Bellandur, Bengaluru - 560103', lat: 12.9352, lng: 77.6953, ward: 'East Zone (Mahadevapura / Indiranagar)' },
  { name: 'HDFC Bank, Outer Ring Road, Bellandur, Bengaluru - 560103', lat: 12.9360, lng: 77.6920, ward: 'East Zone (Mahadevapura / Indiranagar)' },
  { name: 'Marathahalli Bridge, Outer Ring Road, Bengaluru - 560037', lat: 12.9569, lng: 77.7011, ward: 'East Zone (Mahadevapura / Indiranagar)' },
  { name: 'Indiranagar 100ft Road, Bengaluru - 560038', lat: 12.9784, lng: 77.6408, ward: 'East Zone (Mahadevapura / Indiranagar)' },
  { name: 'Koramangala Sony World Junction, Bengaluru - 560034', lat: 12.9352, lng: 77.6245, ward: 'South Zone (Koramangala / BTM / Jayanagar)' },
  { name: 'MG Road Metro Station, Bengaluru - 560001', lat: 12.9756, lng: 77.6067, ward: 'Central Zone (MG Road / CBD)' },
  { name: 'Whitefield ITPL Main Road, Bengaluru - 560066', lat: 12.9863, lng: 77.7308, ward: 'East Zone (Mahadevapura / Indiranagar)' },
  { name: 'HSR Layout 27th Main Road, Bengaluru - 560102', lat: 12.9121, lng: 77.6446, ward: 'South Zone (Koramangala / BTM / Jayanagar)' },
  { name: 'Hebbal Flyover, Bellary Road, Bengaluru - 560024', lat: 13.0358, lng: 77.5970, ward: 'North Zone (Hebbal / Yelahanka)' },
  { name: 'Jayanagar 4th Block Complex, Bengaluru - 560011', lat: 12.9299, lng: 77.5824, ward: 'South Zone (Koramangala / BTM / Jayanagar)' },
  { name: 'Silk Board Junction, Hosur Road, Bengaluru - 560068', lat: 12.9176, lng: 77.6238, ward: 'South Zone (Koramangala / BTM / Jayanagar)' },
  { name: 'Malleshwaram 8th Cross, Bengaluru - 560003', lat: 12.9982, lng: 77.5703, ward: 'West Zone (Malleshwaram / Rajajinagar)' }
];

export default function CitizenPortalView({
  onSwitchToAuthority,
  onOpenOfficerAuth,
  isAuthenticated,
  officer,
  user,
  onLogout
}) {
  const { theme, toggleTheme, isDark } = useTheme();
  const { t, currentLanguage } = useLanguage();

  // Helper mappings
  const getCategoryKey = (catId) => {
    switch (catId) {
      case 'Pothole / Road Damage': return 'pothole';
      case 'Garbage / Solid Waste': return 'garbage';
      case 'Water Leakage': return 'water';
      case 'Drainage & Flooding': return 'drainage';
      case 'Streetlight Failure': return 'streetlight';
      case 'Traffic Hazard': return 'traffic';
      default: return 'other';
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return '';
    const key = status.toLowerCase().replace(/\s+/g, '_');
    return t(`status.${key}`, status);
  };

  // Navigation: 'report', 'track', 'feed', 'emergency', 'help'
  const [activeNav, setActiveNav] = useState('report');

  // Form Fields
  const [category, setCategory] = useState('Pothole / Road Damage');
  const [title, setTitle] = useState('');
  const [urgency, setUrgency] = useState('Moderate - Regular repair');
  const [wardZone, setWardZone] = useState('East Zone (Mahadevapura / Indiranagar)');
  const [description, setDescription] = useState('');

  // Voice Dictation (Speech-to-Text)
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [selectedAddress, setSelectedAddress] = useState('Kadubeesanahalli Bridge, Bellandur, Bengaluru - 560103');
  const [landmarkAddress, setLandmarkAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | locating | detected | denied
  const [gpsFeedback, setGpsFeedback] = useState('');

  // Photo Attachment
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Form Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Citizen Profile & Notifications
  const [citizenName, setCitizenName] = useState(user?.name || user?.full_name || 'Ramesh Kumar');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [citizenPhone, setCitizenPhone] = useState(user?.phone || '+91 98450 12345');
  const [citizenEmail, setCitizenEmail] = useState(user?.email || 'ramesh.kumar@example.com');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.name || user.full_name) setCitizenName(user.name || user.full_name);
      if (user.email) setCitizenEmail(user.email);
      if (user.phone) setCitizenPhone(user.phone);
    }
  }, [user]);

  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Welcome to UrbanPulse Civic Services.', time: 'Just now', unread: true }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Ticket Tracking
  const [trackSearchId, setTrackSearchId] = useState('');
  const [trackedRecord, setTrackedRecord] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReasonText, setReopenReasonText] = useState('');
  const [reopenSubmitting, setReopenSubmitting] = useState(false);

  // Community Reports (Feed)
  const [recentGrievances, setRecentGrievances] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedFilterCategory, setFeedFilterCategory] = useState('All');
  const [feedSearch, setFeedSearch] = useState('');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState('');

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const trackMapRef = useRef(null);
  const trackMapInstRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // 7 Issue Categories exactly matching specification
  const categories = [
    {
      id: 'Pothole / Road Damage',
      label: t('categories.pothole.label', 'Pothole / Road Damage'),
      desc: t('categories.pothole.desc', 'Potholes, asphalt cracks, cave-ins, and uneven road surfaces'),
      dept: t('categories.pothole.dept', 'BBMP Road Infrastructure Cell'),
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M4 19h16M4 19l4-12h8l4 12" />
          <path d="M9 19v-4a3 3 0 0 1 6 0v4" />
        </svg>
      )
    },
    {
      id: 'Garbage / Solid Waste',
      label: t('categories.garbage.label', 'Garbage / Solid Waste'),
      desc: t('categories.garbage.desc', 'Uncollected trash, illegal dumping, overflowing bins, and debris'),
      dept: t('categories.garbage.dept', 'BBMP Solid Waste Management (SWM)'),
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      )
    },
    {
      id: 'Water Leakage',
      label: t('categories.water.label', 'Water Leakage'),
      desc: t('categories.water.desc', 'Broken water mains, leaking pipes, supply disruptions, and valve bursts'),
      dept: t('categories.water.dept', 'BWSSB Water Supply Division'),
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      )
    },
    {
      id: 'Drainage & Flooding',
      label: t('categories.drainage.label', 'Drainage & Flooding'),
      desc: t('categories.drainage.desc', 'Clogged storm drains, waterlogging, overflowing sewage, and stagnant water'),
      dept: t('categories.drainage.dept', 'BBMP Stormwater Drainage & BWSSB'),
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M2 12c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3" />
          <path d="M2 17c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3" />
        </svg>
      )
    },
    {
      id: 'Streetlight Failure',
      label: t('categories.streetlight.label', 'Streetlight Failure'),
      desc: t('categories.streetlight.desc', 'Non-working streetlights, dark stretches, flickering lamps, and damaged poles'),
      dept: t('categories.streetlight.dept', 'BESCOM Electrical Infrastructure'),
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M9 18h6M10 22h4" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
      )
    },
    {
      id: 'Traffic Hazard',
      label: t('categories.traffic.label', 'Traffic Hazard'),
      desc: t('categories.traffic.desc', 'Broken traffic signals, fallen trees, road blockages, and missing signs'),
      dept: t('categories.traffic.dept', 'Bengaluru Traffic Police (BTP)'),
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    },
    {
      id: 'Other Civic Issue',
      label: t('categories.other.label', 'Other Civic Issue'),
      desc: t('categories.other.desc', 'Encroachments, illegal hoarding, noise violations, and stray animals'),
      dept: t('categories.other.dept', 'BBMP Central Administration'),
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="18" cy="12" r="1.5" />
          <circle cx="6" cy="12" r="1.5" />
        </svg>
      )
    }
  ];

  // Reverse Geocoding via OSM Nominatim with instant local fallback
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          const parts = data.display_name.split(', ');
          const shortAddr = parts.slice(0, 4).join(', ');
          setSelectedAddress(shortAddr);
          return;
        }
      }
    } catch {
      // Fallback
    }

    const closest = BENGALURU_PRESET_LOCATIONS.find(loc => {
      const dLat = Math.abs(loc.lat - lat);
      const dLng = Math.abs(loc.lng - lng);
      return dLat < 0.015 && dLng < 0.015;
    });

    if (closest) {
      setSelectedAddress(closest.name);
    } else {
      setSelectedAddress(`Near Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}), Bengaluru`);
    }
  }, []);

  // Initialize Leaflet Map for Tab 1 (Report)
  useEffect(() => {
    if (activeNav !== 'report' || !window.L || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      return;
    }

    const map = window.L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false
    }).setView([latitude, longitude], 14);

    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const redPinIcon = window.L.divIcon({
      html: `<div style="
        width: 32px;
        height: 32px;
        background: #EF4444;
        border: 3px solid #FFFFFF;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 14px rgba(239, 68, 68, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 10px; height: 10px; background: #FFFFFF; border-radius: 50%; transform: rotate(45deg);"></div>
      </div>`,
      className: 'citizen-custom-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    const marker = window.L.marker([latitude, longitude], {
      icon: redPinIcon,
      draggable: true
    }).addTo(map);

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      const newLat = Number(pos.lat.toFixed(5));
      const newLng = Number(pos.lng.toFixed(5));
      setLatitude(newLat);
      setLongitude(newLng);
      setGpsStatus('detected');
      setGpsFeedback(`Pin adjusted: ${newLat}, ${newLng}`);
      reverseGeocode(newLat, newLng);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      const newLat = Number(e.latlng.lat.toFixed(5));
      const newLng = Number(e.latlng.lng.toFixed(5));
      setLatitude(newLat);
      setLongitude(newLng);
      setGpsStatus('detected');
      setGpsFeedback(`Pin placed at: ${newLat}, ${newLng}`);
      reverseGeocode(newLat, newLng);
    });

    mapInstanceRef.current = map;
    markerInstanceRef.current = marker;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeNav, reverseGeocode]);

  // Initialize Track Mini-Map for Tab 2
  useEffect(() => {
    if (activeNav !== 'track' || !trackedRecord?.complaint?.latitude || !window.L || !trackMapRef.current) return;

    if (trackMapInstRef.current) {
      trackMapInstRef.current.remove();
      trackMapInstRef.current = null;
    }

    const tLat = trackedRecord.complaint.latitude;
    const tLng = trackedRecord.complaint.longitude;

    const tMap = window.L.map(trackMapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([tLat, tLng], 15);

    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(tMap);

    const pinIcon = window.L.divIcon({
      html: `<div style="width:24px; height:24px; border-radius:50%; background:#2563EB; border:3px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;">
        <div style="width:6px; height:6px; border-radius:50%; background:white;"></div>
      </div>`,
      className: 'track-mini-pin',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    window.L.marker([tLat, tLng], { icon: pinIcon }).addTo(tMap);
    trackMapInstRef.current = tMap;

    return () => {
      if (trackMapInstRef.current) {
        trackMapInstRef.current.remove();
        trackMapInstRef.current = null;
      }
    };
  }, [activeNav, trackedRecord]);

  // Sync marker and pan when lat/lng update
  const panToCoords = (lat, lng, zoom = 15) => {
    setLatitude(lat);
    setLongitude(lng);
    if (markerInstanceRef.current && mapInstanceRef.current) {
      markerInstanceRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 0.8 });
    }
  };

  // Browser GPS detection
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      setGpsFeedback('Geolocation is not supported by your browser.');
      showToast('Geolocation not available');
      return;
    }

    setGpsStatus('locating');
    setGpsFeedback('Acquiring device GPS satellites...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        panToCoords(lat, lng, 16);
        setGpsStatus('detected');
        setGpsFeedback(`GPS Position Acquired: ${lat}, ${lng}`);
        reverseGeocode(lat, lng);
        showToast('Device location acquired');
      },
      () => {
        setGpsStatus('denied');
        setGpsFeedback('Location permission denied. Click or drag on map to set position.');
        showToast('GPS permission denied');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Address Search Logic
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setShowSearchDropdown(true);

    const q = text.toLowerCase();
    const localMatches = BENGALURU_PRESET_LOCATIONS.filter(item =>
      item.name.toLowerCase().includes(q)
    );
    setSearchResults(localMatches);

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text + ', Bengaluru')}&countrycodes=in&viewbox=77.3,13.2,77.8,12.7&bounded=0&limit=5`);
        if (res.ok) {
          const remoteData = await res.json();
          const mappedRemote = remoteData.map(item => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            ward: wardZone
          }));
          setSearchResults(prev => {
            const names = new Set(prev.map(p => p.name));
            const combined = [...prev];
            for (const r of mappedRemote) {
              if (!names.has(r.name)) combined.push(r);
            }
            return combined;
          });
        }
      } catch {
        // Fallback
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  };

  const handleSelectSearchResult = (item) => {
    setSelectedAddress(item.name);
    setSearchQuery('');
    setShowSearchDropdown(false);
    panToCoords(item.lat, item.lng, 16);
    if (item.ward) setWardZone(item.ward);
    showToast(`Location set: ${item.name.split(',')[0]}`);
  };

  const handleClearLocation = () => {
    setSelectedAddress('');
    setLandmarkAddress('');
    setSearchQuery('');
    setGpsFeedback('');
    panToCoords(12.9716, 77.5946, 13);
  };

  // Photo Upload Handler with Format & Size Validation
  const processImageFile = (file) => {
    setFileError('');
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFileError(t('errors.fileFormatInvalid', 'Invalid format. Accepted: JPG, PNG, WebP.'));
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError(t('errors.fileSizeExceeded', 'Photo exceeds maximum allowable 10 MB limit.'));
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    showToast(t('report.photoAttached', 'Photo evidence attached'));
  };

  const handleFileChange = (e) => {
    processImageFile(e.target.files?.[0]);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Voice Speech-to-Text Recognition Functions
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast(t('report.speechNotSupported', 'Voice recognition is not supported in this browser. Please type or use Chrome / Edge.'));
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      const langMap = {
        en: 'en-IN',
        kn: 'kn-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        te: 'te-IN'
      };
      recognition.lang = langMap[currentLanguage] || 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        showToast(t('report.listeningToast', 'Microphone active. Speak clearly to dictate your description.'));
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += chunk;
          } else {
            currentInterim += chunk;
          }
        }

        if (finalTranscript) {
          setDescription((prev) => {
            const trimmed = prev.trim();
            const addition = finalTranscript.trim();
            const combined = trimmed ? `${trimmed} ${addition}` : addition;
            return combined.slice(0, 500);
          });
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          showToast(t('report.micPermissionDenied', 'Microphone access was denied. Please allow microphone permissions in your browser.'));
        } else if (event.error !== 'no-speech') {
          showToast(t('report.speechError', `Voice error: ${event.error}`));
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start SpeechRecognition:', err);
      showToast(t('report.micInitError', 'Could not access microphone. Please check browser permissions.'));
      setIsListening(false);
      setInterimTranscript('');
    }
  }, [currentLanguage, t]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Reset Form
  const handleResetForm = () => {
    stopListening();
    setTitle('');
    setDescription('');
    setCategory('Pothole / Road Damage');
    setUrgency('Moderate - Regular repair');
    setWardZone('East Zone (Mahadevapura / Indiranagar)');
    handleRemovePhoto();
    setSubmittedTicket(null);
    setSubmitError('');
    setSelectedAddress('Kadubeesanahalli Bridge, Bellandur, Bengaluru - 560103');
    setLandmarkAddress('');
    panToCoords(12.9716, 77.5946, 13);
    showToast(t('report.formReset', 'Form reset'));
  };

  // Form Submit Handler -> POST /api/grievances
  const handleSubmitReport = async (e) => {
    if (e) e.preventDefault();
    stopListening();
    setSubmitError('');

    if (!title.trim() || title.trim().length < 4) {
      setSubmitError(t('errors.titleRequired', 'Please enter a clear incident title (at least 4 characters).'));
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setSubmitError(t('errors.descRequired', 'Please provide a detailed description of the civic issue (at least 10 characters).'));
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('category', category);
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    const urgencyVal = urgency.includes(' - ') ? urgency.split(' - ')[0] : urgency;
    formData.append('urgency', urgencyVal);
    formData.append('ward_zone', wardZone);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    
    const finalLandmark = landmarkAddress.trim()
      ? `${selectedAddress} (Landmark: ${landmarkAddress.trim()})`
      : selectedAddress;
    formData.append('landmark_address', finalLandmark);

    formData.append('is_anonymous', isAnonymous ? 'true' : 'false');
    if (!isAnonymous) {
      formData.append('citizen_name', citizenName);
      formData.append('citizen_phone', citizenPhone);
      formData.append('citizen_email', citizenEmail);
    }

    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      const res = await fetch(`${API_BASE}/grievances`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || t('errors.serverError', 'Failed to lodge grievance with municipal command.'));
      }

      const result = await res.json();
      setSubmittedTicket(result);
      showToast(`${t('report.successTitle', 'Grievance lodged!')} Ticket ID: ${result.ticket_id}`);
      
      setNotifications(prev => [
        { id: Date.now(), text: `${t('report.successTitle', 'Grievance lodged')}: ${result.ticket_id}`, time: 'Just now', unread: true },
        ...prev
      ]);
    } catch (err) {
      setSubmitError(err.message || t('errors.serverError', 'An unexpected network error occurred.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ticket Lookup -> GET /api/grievances/track/{ticket_id}
  const handleTrackSearch = async (ticketIdToQuery) => {
    const query = (ticketIdToQuery || trackSearchId).trim();
    if (!query) return;

    setTrackLoading(true);
    setTrackError('');
    setTrackedRecord(null);

    try {
      const res = await fetch(`${API_BASE}/grievances/track/${encodeURIComponent(query)}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || t('errors.ticketNotFound', `No record found for Ticket ID "${query}".`));
      }
      const data = await res.json();
      setTrackedRecord(data);
    } catch (err) {
      setTrackError(err.message || t('errors.ticketNotFound', 'Ticket lookup failed.'));
    } finally {
      setTrackLoading(false);
    }
  };

  // Citizen Reopen Request -> POST /api/grievances/{ticket_id}/reopen
  const handleReopenSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!trackedRecord?.complaint?.ticket_number) return;
    if (!reopenReasonText.trim() || reopenReasonText.trim().length < 10) {
      showToast(t('errors.reopenReasonRequired', 'Please provide a substantive justification (min 10 characters).'));
      return;
    }

    setReopenSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/${trackedRecord.complaint.ticket_number}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reopenReasonText.trim() })
      });
      if (res.ok) {
        showToast(t('track.reopenedSuccess', 'Complaint reopened and routed to supervisor queue.'));
        setShowReopenModal(false);
        setReopenReasonText('');
        handleTrackSearch(trackedRecord.complaint.ticket_number);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || t('errors.reopenFailed', 'Failed to reopen complaint.'));
      }
    } catch {
      showToast(t('errors.serverError', 'Network error while requesting ticket reopen.'));
    } finally {
      setReopenSubmitting(false);
    }
  };

  // Fetch Community Reports Feed -> GET /api/grievances?limit=50
  const fetchRecentFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grievances?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setRecentGrievances(data.grievances || data.complaints || []);
      }
    } catch (e) {
      console.warn('Feed fetch warning:', e);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentFeed();
  }, [fetchRecentFeed]);

  // Filtered Community Reports
  const filteredFeed = recentGrievances.filter(item => {
    const matchCat = feedFilterCategory === 'All' || item.category === feedFilterCategory;
    const matchSearch = !feedSearch.trim() ||
      item.title?.toLowerCase().includes(feedSearch.toLowerCase()) ||
      item.description?.toLowerCase().includes(feedSearch.toLowerCase()) ||
      item.ticket_number?.toLowerCase().includes(feedSearch.toLowerCase()) ||
      item.landmark_address?.toLowerCase().includes(feedSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="citizen-portal-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '10px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(16px)',
          zIndex: 99999,
          fontSize: '0.8rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid #334155',
          animation: 'fadeIn 0.2s ease'
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* MOBILE DRAWER BACKDROP (ONLY ON MOBILE SCREENS <= 768px)            */}
      {/* =================================================================== */}
      {mobileDrawerOpen && (
        <div
          className="citizen-drawer-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* =================================================================== */}
      {/* MODERN GLASSMORPHIC CITIZEN SIDEBAR (POLYMORPHIC DOCK / DRAWER)     */}
      {/* =================================================================== */}
      <aside className={`citizen-sidebar-modern ${sidebarCollapsed ? 'collapsed' : ''} ${mobileDrawerOpen ? 'mobile-open' : ''}`}>
        <div className="citizen-sidebar-top-section">
          {/* 1. macOS Style Window Traffic Dots */}
          <div className="citizen-mac-dots">
            <span className="mac-dot red"></span>
            <span className="mac-dot yellow"></span>
            <span className="mac-dot green"></span>
          </div>

          {/* 2. Profile Card & Collapse Toggle Pill */}
          <div className="citizen-profile-row">
            <div
              className="citizen-profile-info"
              onClick={() => { setShowProfileModal(true); setMobileDrawerOpen(false); }}
              title="Click to view & edit Citizen Profile"
            >
              <div className="citizen-avatar-wrap">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
                  alt="Citizen Avatar"
                  className="citizen-avatar-img"
                />
                <span className="citizen-online-indicator"></span>
              </div>
              {!sidebarCollapsed && (
                <div className="citizen-profile-texts">
                  <div className="citizen-greeting-text">Good Day 👋</div>
                  <div className="citizen-name-text">{citizenName}</div>
                </div>
              )}
            </div>

            {/* Collapse / Expand Toggle Pill Button */}
            <button
              type="button"
              className="citizen-collapse-tab"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{
                  transform: sidebarCollapsed ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease'
                }}
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          {/* 3. Subtle Horizontal Divider */}
          <div className="citizen-sidebar-divider" />

          {/* 4. Menu Header: "Menu: 5" with adjustments icon */}
          <div className="citizen-menu-header">
            {!sidebarCollapsed && <span className="citizen-menu-label">Menu: 5</span>}
            <div className="citizen-menu-icon" title="Preferences">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="17" x2="20" y2="17" />
                <circle cx="8" cy="7" r="2" fill="currentColor" />
                <circle cx="16" cy="17" r="2" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* 5. Nav Menu Items */}
          <nav className="citizen-nav-menu">
            {/* Feature 1: Report an Issue */}
            <button
              type="button"
              className={`citizen-menu-item ${activeNav === 'report' ? 'active' : ''}`}
              onClick={() => { setActiveNav('report'); setSubmittedTicket(null); setMobileDrawerOpen(false); }}
              title={t('nav.reportIssue', 'Report an Issue')}
            >
              <div className="citizen-item-left">
                <div className="citizen-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    <line x1="12" y1="11" x2="12" y2="17" />
                    <line x1="9" y1="14" x2="15" y2="14" />
                  </svg>
                </div>
                {!sidebarCollapsed && (
                  <span className="citizen-item-label">{t('nav.reportIssue', 'Report an Issue')}</span>
                )}
              </div>
              {!sidebarCollapsed && activeNav !== 'report' && (
                <span className="citizen-plus-circle" title="Submit Grievance">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.8">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              )}
            </button>

            {/* Feature 2: Track My Complaint */}
            <button
              type="button"
              className={`citizen-menu-item ${activeNav === 'track' ? 'active' : ''}`}
              onClick={() => { setActiveNav('track'); setMobileDrawerOpen(false); }}
              title={t('nav.trackComplaint', 'Track My Complaint')}
            >
              <div className="citizen-item-left">
                <div className="citizen-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <circle cx="12" cy="15" r="2" fill="currentColor" />
                  </svg>
                </div>
                {!sidebarCollapsed && (
                  <span className="citizen-item-label">{t('nav.trackComplaint', 'Track My Complaint')}</span>
                )}
              </div>
              {!sidebarCollapsed && activeNav !== 'track' && (
                <span className="citizen-mini-accessory-icon">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
              )}
            </button>

            {/* Feature 3: Community Reports */}
            <button
              type="button"
              className={`citizen-menu-item ${activeNav === 'feed' ? 'active' : ''}`}
              onClick={() => { setActiveNav('feed'); setMobileDrawerOpen(false); }}
              title={t('nav.communityReports', 'Community Reports')}
            >
              <div className="citizen-item-left">
                <div className="citizen-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                {!sidebarCollapsed && (
                  <span className="citizen-item-label">{t('nav.communityReports', 'Community Reports')}</span>
                )}
              </div>
              {!sidebarCollapsed && (
                <div className="citizen-avatars-badge-group">
                  <div className="citizen-avatar-stack">
                    <span className="avatar-mini a1" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80)' }}></span>
                    <span className="avatar-mini a2" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&auto=format&fit=crop&q=80)' }}></span>
                    <span className="avatar-mini a3" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&auto=format&fit=crop&q=80)' }}></span>
                  </div>
                  <span className="citizen-count-badge">4</span>
                </div>
              )}
            </button>

            {/* Feature 4: Emergency Helplines */}
            <button
              type="button"
              className={`citizen-menu-item ${activeNav === 'emergency' ? 'active' : ''}`}
              onClick={() => { setActiveNav('emergency'); setMobileDrawerOpen(false); }}
              title={t('nav.emergencyHelplines', 'Emergency Helplines')}
            >
              <div className="citizen-item-left">
                <div className="citizen-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    <circle cx="19" cy="4" r="2.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
                  </svg>
                </div>
                {!sidebarCollapsed && (
                  <span className="citizen-item-label">{t('nav.emergencyHelplines', 'Emergency Helplines')}</span>
                )}
              </div>
              {!sidebarCollapsed && (
                <span className="citizen-sos-indicator" title="24x7 Emergency Squads Active">
                  24x7
                </span>
              )}
            </button>

            {/* Feature 5: Help & Guidelines */}
            <button
              type="button"
              className={`citizen-menu-item ${activeNav === 'help' ? 'active' : ''}`}
              onClick={() => { setActiveNav('help'); setMobileDrawerOpen(false); }}
              title={t('nav.helpGuidelines', 'Help & Guidelines')}
            >
              <div className="citizen-item-left">
                <div className="citizen-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                {!sidebarCollapsed && (
                  <span className="citizen-item-label">{t('nav.helpGuidelines', 'Help & Guidelines')}</span>
                )}
              </div>
            </button>
          </nav>

          {/* 6. Service: 2 Section */}
          <div className="citizen-service-section">
            <div className="citizen-service-header">
              {!sidebarCollapsed && <span className="citizen-menu-label">Service: 2</span>}
              <div className="citizen-service-edit-icon" title="Municipal Authorities">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </div>
            </div>

            {/* White Service Card */}
            <div className="citizen-service-card">
              <button
                type="button"
                className="citizen-service-action-btn"
                onClick={() => { onSwitchToAuthority(); setMobileDrawerOpen(false); }}
                title="Official Municipal Command Console"
              >
                <div className="citizen-service-btn-left">
                  <div className="citizen-service-icon-box">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563EB" strokeWidth="2.2">
                      <line x1="3" y1="21" x2="21" y2="21" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <polyline points="5 6 12 3 19 6" />
                      <line x1="4" y1="10" x2="4" y2="21" />
                      <line x1="20" y1="10" x2="20" y2="21" />
                    </svg>
                  </div>
                  {!sidebarCollapsed && (
                    <div style={{ textAlign: 'left' }}>
                      <div className="citizen-service-title">{t('brand.switchToAuthority', 'Command Console')}</div>
                      <div className="citizen-service-sub">Restricted Municipal</div>
                    </div>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#94A3B8" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 7. Bottom Skyline & Theme Controls */}
        <div className="citizen-sidebar-bottom-modern">
          {!sidebarCollapsed && (
            <div className="citizen-footer-telemetry">
              <span className="live-grid-dot"></span>
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>BBMP Smart City Grid</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', width: '100%', paddingTop: 6, borderTop: '1px solid rgba(226, 232, 240, 0.7)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
              <div
                onClick={toggleTheme}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 20,
                  background: isDark ? '#3B82F6' : '#CBD5E1',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  transform: isDark ? 'translateX(16px)' : 'translateX(0px)',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                }} />
              </div>
              {!sidebarCollapsed && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
              )}
            </label>
          </div>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* MAIN WORKSPACE AREA (100% WIDTH, FULL SCREEN UTILIZATION)           */}
      {/* =================================================================== */}
      <main className="citizen-main-area">
        {/* Top Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="citizen-mobile-hamburger-btn"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-title, #0F172A)', margin: 0, letterSpacing: '-0.01em' }}>
                {activeNav === 'report' && t('header.reportTitle', 'Report a Civic Grievance')}
                {activeNav === 'track' && t('header.trackTitle', 'Track My Grievance')}
                {activeNav === 'feed' && t('header.feedTitle', 'Bengaluru Community Reports')}
                {activeNav === 'emergency' && t('header.emergencyTitle', 'Emergency Helplines & Rapid Action Squads')}
                {activeNav === 'help' && t('header.helpTitle', 'Citizen Help & Reporting Guidelines')}
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0' }}>
                {activeNav === 'report' && t('header.reportSubtitle', 'Help make Bengaluru better. Report infrastructure problems directly to the municipal team.')}
                {activeNav === 'track' && t('header.trackSubtitle', 'Real-time multi-stage status, department routing, and authorized field resolution proofs.')}
                {activeNav === 'feed' && t('header.feedSubtitle', 'Live citizen grievances submitted across all BBMP zones and municipal divisions.')}
                {activeNav === 'emergency' && t('header.emergencySubtitle', '24x7 municipal hotlines for life-safety emergencies, arterial bursts, and power hazards.')}
                {activeNav === 'help' && t('header.helpSubtitle', 'Standards, SLA turnaround benchmarks, and photographic evidence tips for faster remediation.')}
              </p>
            </div>
          </div>

          {/* Header Right: Language Selector + Notification Bell + User Profile Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
            <LanguageSelector />
            <button
              type="button"
              className="citizen-header-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'var(--card-bg, #FFFFFF)',
                border: '1px solid var(--card-border, #CBD5E1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-body, #334155)',
                cursor: 'pointer',
                position: 'relative'
              }}
              title={t('common.notifications', 'Notifications')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notifications.some(n => n.unread) && (
                <span style={{
                  position: 'absolute',
                  top: 5,
                  right: 6,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#EF4444',
                  border: '1.5px solid #FFFFFF'
                }} />
              )}
            </button>

            {showNotifications && (
              <div
                className="citizen-notifications-menu"
                style={{
                  position: 'absolute',
                  top: 48,
                  right: 120,
                  width: 280,
                  background: 'var(--card-bg, #FFFFFF)',
                  border: '1px solid var(--card-border, #E2E8F0)',
                  borderRadius: 12,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                  zIndex: 1000,
                  padding: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>
                  <strong style={{ fontSize: '0.78rem', color: 'var(--text-title, #0F172A)' }}>
                    {t('common.notifications', 'Notifications')}
                  </strong>
                  <span style={{ fontSize: '0.68rem', color: '#2563EB', cursor: 'pointer' }} onClick={() => setNotifications(n => n.map(x => ({ ...x, unread: false })))}>
                    {t('common.markRead', 'Mark read')}
                  </span>
                </div>
                {notifications.map(item => (
                  <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid #F1F5F9', fontSize: '0.74rem' }}>
                    <div style={{ color: 'var(--text-body, #334155)' }}>{item.text}</div>
                    <div style={{ fontSize: '0.64rem', color: '#94A3B8', marginTop: 2 }}>{item.time}</div>
                  </div>
                ))}
              </div>
            )}

            <div
              onClick={() => setShowProfileModal(true)}
              className="citizen-header-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '3px 10px 3px 5px',
                borderRadius: 20,
                background: 'var(--card-bg, #FFFFFF)',
                border: '1px solid var(--card-border, #CBD5E1)',
                cursor: 'pointer'
              }}
              title={t('common.profileSettings', 'Citizen Profile Settings')}
            >
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: '#0F172A',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {citizenName.charAt(0)}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-title, #0F172A)' }}>
                {citizenName.split(' ')[0]}
              </span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out to Login Page"
                className="citizen-header-btn"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'var(--card-bg, #FFFFFF)',
                  border: '1px solid var(--card-border, #CBD5E1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FECACA'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = 'var(--card-border, #CBD5E1)'; }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: REPORT CIVIC ISSUE FORM (FULL SCREEN TWO-COLUMN)             */}
        {/* =================================================================== */}
        {activeNav === 'report' && (
          <div style={{ width: '100%' }}>
            {submittedTicket ? (
              <div className="citizen-card" style={{ width: '100%', maxWidth: 960, margin: '1.5rem auto', textAlign: 'center', padding: '2.5rem 2rem' }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto'
                }}>
                  <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-title, #0F172A)', margin: 0 }}>
                  {t('report.successTitle', 'Grievance Registered Successfully')}
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748B)', marginTop: 4 }}>
                  {t('report.successDesc', 'Your report has been authenticated, geotagged, and routed to the municipal dispatch squad.')}
                </p>

                <div style={{
                  background: 'var(--bg-subtle, #F8FAFC)',
                  border: '1.5px dashed #2563EB',
                  borderRadius: 12,
                  padding: '18px',
                  margin: '1.25rem 0'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t('report.ticketIdLabel', 'Complaint Reference Number')}
                  </div>
                  <div className="notranslate" style={{ fontSize: '1.65rem', fontWeight: 700, color: '#2563EB', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em', margin: '4px 0' }}>
                    {submittedTicket.ticket_id}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(submittedTicket.ticket_id);
                      showToast(t('report.copied', 'Copied to clipboard!'));
                    }}
                    style={{
                      background: '#EFF6FF',
                      color: '#1D4ED8',
                      border: '1px solid #BFDBFE',
                      borderRadius: 6,
                      padding: '4px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {t('report.copyTicket', 'Copy Ticket ID')}
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                  textAlign: 'left',
                  background: 'var(--bg-subtle, #F8FAFC)',
                  border: '1px solid var(--card-border, #E2E8F0)',
                  padding: 14,
                  borderRadius: 10,
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem'
                }}>
                  <div>
                    <div style={{ color: 'var(--text-muted, #64748B)', fontSize: '0.72rem' }}>{t('report.assignedDeptLabel', 'Assigned Municipal Department:')}</div>
                    <strong style={{ color: 'var(--text-title, #0F172A)', fontWeight: 600 }}>{submittedTicket.assigned_authority}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted, #64748B)', fontSize: '0.72rem' }}>{t('report.slaLabel', 'Target Resolution SLA:')}</div>
                    <strong style={{ color: '#047857', fontWeight: 600 }}>{t('report.withinHours', { hours: submittedTicket.sla_hours, defaultValue: `Within ${submittedTicket.sla_hours} Hours` })}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setTrackSearchId(submittedTicket.ticket_id);
                      setActiveNav('track');
                      handleTrackSearch(submittedTicket.ticket_id);
                    }}
                    style={{
                      background: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '9px 20px',
                      borderRadius: 18,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    {t('report.trackNowBtn', 'Track Complaint Now')} &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    style={{
                      background: 'var(--card-bg, #FFFFFF)',
                      color: 'var(--text-body, #334155)',
                      border: '1px solid var(--card-border, #E2E8F0)',
                      padding: '9px 18px',
                      borderRadius: 18,
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    {t('report.reportAnotherBtn', 'Report Another Issue')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} style={{ width: '100%' }}>
                <div className="citizen-report-grid">
                  {/* LEFT PANE: Incident Details & Proof */}
                  <div className="citizen-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Header */}
                    <div style={{ borderBottom: '1px solid var(--card-border-subtle, #F1F5F9)', paddingBottom: 10 }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: 0 }}>
                        {t('report.detailsCardTitle', 'Incident Information')}
                      </h3>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', margin: '2px 0 0 0' }}>
                        {t('report.detailsCardSubtitle', 'Select the issue category, urgency level, and describe the civic problem.')}
                      </p>
                    </div>

                    {/* 1. Category Chips */}
                    <div>
                      <label className="citizen-label">
                        {t('report.categoryCardTitle', 'Issue Category *')}
                      </label>
                      <div className="citizen-category-chips">
                        {categories.map((cat) => {
                          const isSelected = category === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              className={`citizen-category-chip ${isSelected ? 'active' : ''}`}
                              onClick={() => setCategory(cat.id)}
                            >
                              <span className="chip-icon">{cat.icon}</span>
                              <span className="chip-label">{cat.label}</span>
                              {isSelected && (
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#2563EB" strokeWidth="3" style={{ flexShrink: 0, marginLeft: 'auto' }}>
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Incident Title */}
                    <div>
                      <label className="citizen-label">
                        {t('report.titleLabel', 'Incident Title *')}
                      </label>
                      <input
                        type="text"
                        required
                        className="citizen-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('report.titlePlaceholder', 'e.g. Deep pothole near Kadubeesanahalli bridge')}
                      />
                    </div>

                    {/* 3. Urgency 4-Tier Segmented Pills */}
                    <div>
                      <label className="citizen-label">
                        {t('urgency.label', 'Urgency & Severity Level *')}
                      </label>
                      <div className="citizen-urgency-grid">
                        {[
                          { id: 'Low - Minor issue', label: t('urgency.low', 'Low'), desc: 'Cosmetic / minor', color: 'low' },
                          { id: 'Moderate - Regular repair', label: t('urgency.moderate', 'Moderate'), desc: 'Standard SLA', color: 'moderate' },
                          { id: 'High - Serious hazard', label: t('urgency.high', 'High'), desc: 'Active road risk', color: 'high' },
                          { id: 'Critical - Immediate danger', label: t('urgency.critical', 'Critical'), desc: 'Life-safety hazard', color: 'critical' },
                        ].map((tier) => {
                          const isSelected = urgency === tier.id;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              className={`citizen-urgency-pill ${tier.color} ${isSelected ? 'selected' : ''}`}
                              onClick={() => setUrgency(tier.id)}
                            >
                              <span className="urgency-dot" />
                              <div className="urgency-meta">
                                <span className="urgency-title">{tier.label}</span>
                                <span className="urgency-desc">{tier.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Ward / Municipal Zone */}
                    <div>
                      <label className="citizen-label">
                        {t('report.wardLabel', 'Ward / Municipal Zone *')}
                      </label>
                      <select
                        className="citizen-select"
                        value={wardZone}
                        onChange={(e) => setWardZone(e.target.value)}
                      >
                        <option value="East Zone (Mahadevapura / Indiranagar)">East Zone (Mahadevapura / Indiranagar)</option>
                        <option value="South Zone (Koramangala / BTM / Jayanagar)">South Zone (Koramangala / BTM / Jayanagar)</option>
                        <option value="Central Zone (MG Road / CBD)">Central Zone (MG Road / CBD)</option>
                        <option value="West Zone (Malleshwaram / Rajajinagar)">West Zone (Malleshwaram / Rajajinagar)</option>
                        <option value="North Zone (Hebbal / Yelahanka)">North Zone (Hebbal / Yelahanka)</option>
                      </select>
                    </div>

                    {/* 5. Description with Voice Typing Microphone */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="citizen-label" style={{ margin: 0 }}>
                          {t('report.descLabel', 'Detailed Description *')}
                        </label>

                        {/* Microphone Voice Dictation Pill */}
                        <button
                          type="button"
                          onClick={isListening ? stopListening : startListening}
                          className={`citizen-mic-btn ${isListening ? 'listening' : ''}`}
                          title={isListening ? t('report.stopVoice', 'Stop voice dictation') : t('report.startVoice', 'Click to speak (Voice Typing)')}
                        >
                          <div className="citizen-mic-icon-wrap">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill={isListening ? '#FFFFFF' : 'none'} stroke="currentColor" strokeWidth="2.2">
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                            {isListening && <span className="citizen-mic-pulse-ring" />}
                          </div>
                          <span>
                            {isListening
                              ? t('report.recording', 'Listening... Tap to Stop')
                              : t('report.voiceDictate', 'Voice Input (Speak)')}
                          </span>
                        </button>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <textarea
                          rows={3}
                          required
                          maxLength={500}
                          className="citizen-textarea"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder={isListening ? t('report.speakPlaceholder', 'Listening... Speak clearly into your microphone now...') : t('report.descPlaceholder', 'Describe the civic issue in detail, dimensions, safety risks, exact spot...')}
                          style={{
                            paddingBottom: 26,
                            resize: 'vertical',
                            borderColor: isListening ? '#EF4444' : undefined,
                            boxShadow: isListening ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                          }}
                        />

                        {/* Real-time interim voice transcript */}
                        {isListening && interimTranscript && (
                          <div style={{
                            position: 'absolute',
                            left: 10,
                            bottom: 6,
                            right: 65,
                            fontSize: '0.68rem',
                            color: '#DC2626',
                            fontStyle: 'italic',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            pointerEvents: 'none'
                          }}>
                            🎙️ {interimTranscript}
                          </div>
                        )}

                        <div style={{
                          position: 'absolute',
                          bottom: 6,
                          right: 10,
                          fontSize: '0.66rem',
                          color: description.length > 450 ? '#EF4444' : '#94A3B8',
                          fontWeight: 500
                        }}>
                          {description.length} / 500
                        </div>
                      </div>

                      {isListening && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 6,
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          color: '#DC2626',
                          fontSize: '0.7rem'
                        }}>
                          <span>Voice dictation active. Speak clearly.</span>
                          <button
                            type="button"
                            onClick={stopListening}
                            style={{
                              background: '#DC2626',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 4,
                              padding: '2px 6px',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 6. Photo Evidence Dropzone */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="citizen-label" style={{ margin: 0 }}>
                          {t('report.photoTitle', 'Photo Evidence (Optional)')}
                        </label>
                        <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>JPG, PNG, WebP (Max 10 MB)</span>
                      </div>

                      {fileError && (
                        <div style={{
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          color: '#B91C1C',
                          padding: '5px 10px',
                          borderRadius: 6,
                          fontSize: '0.72rem',
                          marginBottom: 8
                        }}>
                          {fileError}
                        </div>
                      )}

                      {!previewUrl ? (
                        <div
                          className={`citizen-dropzone-compact ${isDragActive ? 'drag-active' : ''}`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2563EB" strokeWidth="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-title, #0F172A)', fontWeight: 500 }}>
                            {t('report.dropzoneText', 'Click to upload photo')}
                            <span style={{ color: 'var(--text-muted, #64748B)', fontWeight: 400 }}> or drag and drop</span>
                          </span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                          />
                        </div>
                      ) : (
                        <div className="citizen-photo-preview-bar">
                          <img
                            src={previewUrl}
                            alt="Incident Evidence Preview"
                            className="preview-img"
                          />
                          <div className="preview-meta">
                            <div className="preview-filename">{selectedFile?.name || 'Evidence_photo.jpg'}</div>
                            <div className="preview-size">{(selectedFile?.size / 1024).toFixed(1)} KB • Geotagged</div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="preview-remove-btn"
                            title={t('report.removePhoto', 'Remove photo')}
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT PANE: Precision Geolocation & Submission */}
                  <div className="citizen-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Header with GPS Location Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border-subtle, #F1F5F9)', paddingBottom: 10 }}>
                      <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: 0 }}>
                          {t('report.locationTitle', 'Precision Geolocation')}
                        </h3>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', margin: '2px 0 0 0' }}>
                          {t('report.locationSubtitle', 'Pinpoint the exact location on the map or use GPS.')}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        disabled={gpsStatus === 'locating'}
                        className="citizen-gps-btn"
                        title="Acquire device GPS location"
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="22" y1="12" x2="18" y2="12" />
                          <line x1="6" y1="12" x2="2" y2="12" />
                          <line x1="12" y1="6" x2="12" y2="2" />
                          <line x1="12" y1="22" x2="12" y2="18" />
                        </svg>
                        <span>{gpsStatus === 'locating' ? t('report.gpsLocating', 'Locating...') : t('report.useMyLocation', 'Use GPS')}</span>
                      </button>
                    </div>

                    {gpsFeedback && (
                      <div style={{
                        fontSize: '0.72rem',
                        padding: '5px 10px',
                        borderRadius: 6,
                        background: gpsStatus === 'detected' ? '#ECFDF5' : '#FFFBEB',
                        color: gpsStatus === 'detected' ? '#047857' : '#B45309',
                        border: gpsStatus === 'detected' ? '1px solid #A7F3D0' : '1px solid #FDE68A'
                      }}>
                        {gpsFeedback}
                      </div>
                    )}

                    {/* Integrated Search Box */}
                    <div className="citizen-search-box">
                      <div className="citizen-search-input-wrap">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#94A3B8" strokeWidth="2.2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
                          placeholder={t('report.searchAddressPlaceholder', 'Search street, landmark, or area (e.g. Bellandur)...')}
                          style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.8rem',
                            color: 'var(--text-title, #0F172A)',
                            background: 'transparent'
                          }}
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchDropdown(false); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {showSearchDropdown && searchResults.length > 0 && (
                        <div className="citizen-search-dropdown">
                          {searchResults.map((item, idx) => (
                            <div
                              key={idx}
                              className="citizen-search-result-item"
                              onClick={() => handleSelectSearchResult(item)}
                            >
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#2563EB" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-title, #0F172A)', fontSize: '0.76rem' }}>
                                  {item.name.split(',')[0]}
                                </div>
                                <div style={{ fontSize: '0.66rem', color: 'var(--text-muted, #64748B)' }}>
                                  {item.name}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Interactive Leaflet Map (Height 280px) */}
                    <div
                      ref={mapContainerRef}
                      style={{
                        width: '100%',
                        height: 280,
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1px solid var(--card-border, #E2E8F0)'
                      }}
                    />

                    {/* Smart Location Summary Card (Replaces bulky raw Lat/Lng boxes!) */}
                    <div className="citizen-location-summary-card">
                      <div className="location-summary-header">
                        <div className="location-pin-icon-wrap">
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#2563EB" strokeWidth="2.5">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        </div>
                        <div className="location-summary-texts">
                          <div className="location-summary-label">{t('report.selectedLocation', 'Selected Geotagged Spot')}</div>
                          <div className="location-summary-address">{selectedAddress || 'Click anywhere on map to pin'}</div>
                        </div>
                        <div className="location-coords-badge">
                          📍 {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                        </div>
                      </div>

                      {/* Optional Specific Landmark Input */}
                      <div style={{ marginTop: 8 }}>
                        <div className="citizen-input-icon-wrap">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#94A3B8" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <input
                            type="text"
                            className="citizen-input"
                            style={{ fontSize: '0.76rem', padding: '6px 10px' }}
                            value={landmarkAddress}
                            onChange={(e) => setLandmarkAddress(e.target.value)}
                            placeholder={t('report.landmarkPlaceholder', 'Nearby landmark / building (e.g. Near HDFC Bank)')}
                          />
                        </div>
                      </div>
                    </div>

                    {submitError && (
                      <div style={{
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#B91C1C',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: '0.76rem',
                        fontWeight: 500
                      }}>
                        {submitError}
                      </div>
                    )}

                    {/* Primary Action Row */}
                    <div>
                      <div className="citizen-form-actions-row">
                        <button
                          type="button"
                          onClick={handleResetForm}
                          className="citizen-btn-secondary"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                          </svg>
                          <span>{t('report.resetBtn', 'Reset')}</span>
                        </button>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="citizen-btn-primary"
                        >
                          {isSubmitting ? (
                            <span>{t('report.submittingBtn', 'Lodging Grievance...')}</span>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                              </svg>
                              <span>{t('report.submitBtn', 'Submit Civic Report')}</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted, #64748B)',
                        textAlign: 'center',
                        marginTop: 8
                      }}>
                        {t('report.submitFooter', 'Directly authenticated and dispatched to municipal squad command.')}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: TRACK MY COMPLAINT (FULL-SCREEN DASHBOARD LAYOUT)            */}
        {/* =================================================================== */}
        {activeNav === 'track' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Search Box Card - Full Width */}
            <div className="citizen-card" style={{ width: '100%' }}>
              <h3 style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: '0 0 4px 0' }}>
                {t('track.searchCardTitle', 'Track Civic Grievance by Ticket ID')}
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748B)', margin: '0 0 14px 0' }}>
                {t('track.searchCardDesc', 'Enter the unique reference identifier provided upon lodging your complaint (e.g. BBMP-2026-1042).')}
              </p>

              <form onSubmit={(e) => { e.preventDefault(); handleTrackSearch(); }} className="citizen-track-search-form">
                <input
                  type="text"
                  required
                  placeholder={t('track.searchPlaceholder', 'Enter Ticket ID (e.g. BBMP-2026-1042)')}
                  value={trackSearchId}
                  onChange={(e) => setTrackSearchId(e.target.value)}
                  className="citizen-input"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={trackLoading}
                  style={{
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: trackLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {trackLoading ? t('track.searchingBtn', 'Searching...') : t('track.searchBtn', 'Track Ticket')}
                </button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: '0.72rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-muted, #64748B)', fontWeight: 500 }}>{t('track.sampleTickets', 'Sample Tickets:')}</span>
                {['BBMP-2026-1042', 'BBMP-2026-1043', 'BBMP-2026-3055'].map((id) => (
                  <span
                    key={id}
                    onClick={() => {
                      setTrackSearchId(id);
                      handleTrackSearch(id);
                    }}
                    style={{
                      color: '#2563EB',
                      cursor: 'pointer',
                      fontWeight: 600,
                      background: 'rgba(37,99,235,0.06)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid #BFDBFE',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>

            {trackError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 500 }}>
                {trackError}
              </div>
            )}

            {/* When a Record is Found: Full-Screen Two-Column Layout */}
            {trackedRecord && (
              <div className="citizen-track-record-grid">
                {/* Left Column: Lifecycle, Description, Notes, Photos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
                  <div className="citizen-card" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--card-border, #E2E8F0)', paddingBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="notranslate" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-title, #0F172A)', fontFamily: 'var(--font-mono)' }}>
                            {trackedRecord.complaint.ticket_number}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: 6,
                            background: trackedRecord.status === 'Resolved' ? '#ECFDF5' : '#EFF6FF',
                            color: trackedRecord.status === 'Resolved' ? '#047857' : '#1D4ED8',
                            border: trackedRecord.status === 'Resolved' ? '1px solid #A7F3D0' : '1px solid #BFDBFE'
                          }}>
                            {getStatusLabel(trackedRecord.status)}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-body, #334155)', margin: '4px 0 0 0' }}>
                          {trackedRecord.complaint.title}
                        </h4>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748B)' }}>{t('track.category', 'Category')}</div>
                        <strong style={{ fontSize: '0.84rem', color: '#2563EB', fontWeight: 600 }}>
                          {t(`categories.${getCategoryKey(trackedRecord.complaint.category)}.label`, trackedRecord.complaint.category)}
                        </strong>
                      </div>
                    </div>

                    {/* 6-Stage Timeline Stepper */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', marginBottom: 8 }}>
                        {t('track.timelineTitle', 'Chronological Remediation Lifecycle')}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${trackedRecord.timeline?.length || 6}, 1fr)`,
                        gap: 6,
                        background: 'var(--bg-subtle, #F8FAFC)',
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid var(--card-border, #E2E8F0)',
                        overflowX: 'auto'
                      }}>
                        {trackedRecord.timeline?.map((step, idx) => (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 95 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: step.done ? '#2563EB' : 'var(--card-border, #CBD5E1)',
                                color: step.done ? '#FFFFFF' : '#64748B',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {step.done ? (
                                  <svg viewBox="0 0 24 24" width="11" height="11" stroke="#FFFFFF" fill="none" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                ) : idx + 1}
                              </div>
                              <div style={{ height: 2, flex: 1, background: step.done ? '#2563EB' : 'var(--card-border, #CBD5E1)' }}></div>
                            </div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: step.done ? 'var(--text-title, #0F172A)' : 'var(--text-muted, #64748B)', marginTop: 4, lineHeight: 1.25 }}>
                              {t(`track.stage${idx + 1}`, step.name)}
                            </div>
                            {step.detail && (
                              <div style={{ fontSize: '0.66rem', color: '#2563EB', fontWeight: 500 }}>
                                {t(`track.stage${idx + 1}Desc`, step.detail)}
                              </div>
                            )}
                            {step.date && (
                              <div style={{ fontSize: '0.64rem', color: 'var(--text-muted, #64748B)' }}>{step.date.split(' ')[0]}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>
                        {t('report.descLabel', 'Description:')}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-body, #334155)', marginTop: 4, lineHeight: 1.5 }}>
                        {trackedRecord.complaint.description}
                      </div>
                    </div>

                    {/* Dispatch Notes */}
                    {trackedRecord.complaint.dispatch_notes && (
                      <div style={{ background: '#EFF6FF', padding: '12px 14px', borderRadius: 8, border: '1px solid #BFDBFE', fontSize: '0.78rem', marginTop: 12 }}>
                        <div style={{ color: '#1D4ED8', fontWeight: 600 }}>
                          {t('track.dispatchNotes', 'Field Crew Dispatch Directive:')}
                        </div>
                        <div style={{ color: '#334155', marginTop: 3 }}>{trackedRecord.complaint.dispatch_notes}</div>
                        {trackedRecord.complaint.dispatch_eta && (
                          <div style={{ color: '#1D4ED8', fontWeight: 600, marginTop: 4 }}>
                            {t('track.etaLabel', 'Estimated Arrival on Site:')} {trackedRecord.complaint.dispatch_eta}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Resolution Notes & Photo */}
                    {trackedRecord.complaint.resolution_notes && (
                      <div style={{ background: '#ECFDF5', padding: '12px 14px', borderRadius: 8, border: '1px solid #A7F3D0', fontSize: '0.78rem', marginTop: 12 }}>
                        <div style={{ color: '#047857', fontWeight: 600 }}>
                          {t('track.resolutionSummary', 'Official Resolution Summary:')}
                        </div>
                        <div style={{ color: '#334155', marginTop: 3 }}>{trackedRecord.complaint.resolution_notes}</div>
                      </div>
                    )}

                    {trackedRecord.complaint.resolution_image_url && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', marginBottom: 6 }}>
                          {t('track.resolutionPhoto', 'Authorized Resolution Proof:')}
                        </div>
                        <div style={{ borderRadius: 8, overflow: 'hidden', maxHeight: 200, border: '1px solid #E2E8F0' }}>
                          <img
                            src={trackedRecord.complaint.resolution_image_url}
                            alt="Resolution Proof"
                            style={{ width: '100%', height: 200, objectFit: 'cover' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Reopen Action */}
                    {(trackedRecord.status === 'Resolved' || trackedRecord.status === 'Rejected') && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--card-border, #E2E8F0)', paddingTop: 12, marginTop: 14 }}>
                        <button
                          type="button"
                          onClick={() => setShowReopenModal(true)}
                          style={{
                            background: '#FFFBEB',
                            color: '#B45309',
                            border: '1px solid #FDE68A',
                            padding: '7px 16px',
                            borderRadius: 8,
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {t('track.reopenBtn', 'Request Ticket Reopen (If Hazard Persists)')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Department, Geotag Map & Audit Trail */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
                  {/* Department & SLA Card */}
                  <div className="citizen-card" style={{ width: '100%' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', marginBottom: 10 }}>
                      {t('track.assignedCardTitle', 'Assigned Municipal Command')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.79rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted, #64748B)' }}>{t('track.assignedDept', 'Authority:')}</span>
                        <strong style={{ color: '#2563EB', fontWeight: 600 }}>{trackedRecord.assigned_authority}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted, #64748B)' }}>{t('track.fieldSquad', 'Assigned Squad:')}</span>
                        <strong style={{ color: 'var(--text-title, #0F172A)', fontWeight: 600 }}>{trackedRecord.complaint.assigned_squad || t('track.notAssigned', 'Pending Squad Assignment')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted, #64748B)' }}>{t('track.targetSla', 'Turnaround SLA:')}</span>
                        <strong style={{ color: '#047857', fontWeight: 600 }}>
                          {t('report.withinHours', { hours: trackedRecord.sla_hours, defaultValue: `Within ${trackedRecord.sla_hours} Hours` })}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted, #64748B)' }}>{t('track.lodgedOn', 'Registered On:')}</span>
                        <span style={{ color: 'var(--text-body, #334155)', fontFamily: 'var(--font-mono)' }}>{trackedRecord.complaint.created_at}</span>
                      </div>
                    </div>
                  </div>

                  {/* Geotagged Location with Embedded Leaflet Mini-Map */}
                  <div className="citizen-card" style={{ width: '100%' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', marginBottom: 6 }}>
                      {t('track.locationCardTitle', 'Geotagged Incident Location')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-body, #334155)', marginBottom: 8 }}>
                      {trackedRecord.complaint.landmark_address}
                    </div>

                    {/* Leaflet Map for Tracked Coordinates */}
                    <div
                      ref={trackMapRef}
                      style={{
                        width: '100%',
                        height: 170,
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '1px solid var(--card-border, #CBD5E1)',
                        marginBottom: 8
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.71rem', color: 'var(--text-muted, #64748B)', fontFamily: 'var(--font-mono)' }}>
                      <span>{t('report.latitude', 'Lat')}: {trackedRecord.complaint.latitude?.toFixed(4)}</span>
                      <span>{t('report.longitude', 'Lng')}: {trackedRecord.complaint.longitude?.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* When No Record is Being Tracked: Full-Screen Recent Tickets List */}
            {!trackedRecord && (
              <div className="citizen-card" style={{ width: '100%' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', marginBottom: 12 }}>
                  {t('track.recentTitle', 'Recent Trackable Civic Grievances in Bengaluru')}
                </div>
                <div className="citizen-recent-tickets-grid">
                  {recentGrievances.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setTrackSearchId(item.ticket_number || item.id);
                        handleTrackSearch(item.ticket_number || item.id);
                      }}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid var(--card-border, #E2E8F0)',
                        background: 'var(--bg-subtle, #F8FAFC)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>
                          {item.ticket_number || item.id}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: item.status === 'Resolved' ? '#ECFDF5' : '#EFF6FF',
                          color: item.status === 'Resolved' ? '#047857' : '#1D4ED8'
                        }}>
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-title, #0F172A)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.71rem', color: 'var(--text-muted, #64748B)', marginTop: 3 }}>
                        {t(`categories.${getCategoryKey(item.category)}.label`, item.category)} • {item.landmark_address?.split(',')[0]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reopen Modal */}
            {showReopenModal && (
              <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999
              }}>
                <div className="citizen-card" style={{ width: 480, maxWidth: '90vw', padding: 24 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-title, #0F172A)', margin: '0 0 8px 0' }}>
                    {t('track.reopenTitle', 'Request Grievance Reopen')}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748B)', margin: '0 0 14px 0' }}>
                    {t('track.reopenSubtitle', 'If the civic hazard was inadequately repaired or has recurred, describe your observation below.')}
                  </p>
                  <form onSubmit={handleReopenSubmit}>
                    <textarea
                      rows={3}
                      required
                      placeholder={t('track.reopenPlaceholder', 'e.g. Cold-mix patch eroded during morning rain, pothole has reopened...')}
                      value={reopenReasonText}
                      onChange={(e) => setReopenReasonText(e.target.value)}
                      className="citizen-textarea"
                      style={{ marginBottom: 14 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setShowReopenModal(false)}
                        style={{
                          background: 'var(--card-bg, #FFFFFF)',
                          border: '1px solid var(--card-border, #CBD5E1)',
                          color: 'var(--text-body, #334155)',
                          padding: '7px 14px',
                          borderRadius: 8,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        {t('track.cancel', 'Cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={reopenSubmitting}
                        style={{
                          background: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '7px 18px',
                          borderRadius: 8,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {reopenSubmitting ? t('common.loading', 'Submitting...') : t('track.submitReopen', 'Submit Reopen')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: COMMUNITY REPORTS (FULL SCREEN FEED WITH METRICS)            */}
        {/* =================================================================== */}
        {activeNav === 'feed' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Top Metrics Row - 4 Full-Width Cards */}
            <div className="citizen-kpi-grid">
              <div className="citizen-card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '0.69rem', color: 'var(--text-muted, #64748B)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('feed.kpiTotal', 'Total Grievances Logged')}
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-title, #0F172A)', marginTop: 2 }}>
                  {recentGrievances.length || 24}
                </div>
                <div style={{ fontSize: '0.67rem', color: '#10B981', fontWeight: 500, marginTop: 2 }}>
                  {t('feed.kpiTotalSub', 'Bengaluru Ward Network')}
                </div>
              </div>

              <div className="citizen-card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '0.69rem', color: 'var(--text-muted, #64748B)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('feed.kpiDispatched', 'Field Squads Dispatched')}
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#2563EB', marginTop: 2 }}>
                  {recentGrievances.filter(g => g.status === 'Crew Dispatched' || g.status === 'In Progress').length || 8}
                </div>
                <div style={{ fontSize: '0.67rem', color: '#2563EB', fontWeight: 500, marginTop: 2 }}>
                  {t('feed.kpiDispatchedSub', 'Active on Arterial Corridors')}
                </div>
              </div>

              <div className="citizen-card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '0.69rem', color: 'var(--text-muted, #64748B)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('feed.kpiSla', 'Resolved within SLA')}
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#059669', marginTop: 2 }}>
                  95.8%
                </div>
                <div style={{ fontSize: '0.67rem', color: '#059669', fontWeight: 500, marginTop: 2 }}>
                  {t('feed.kpiSlaSub', 'Municipal SLA Compliance')}
                </div>
              </div>

              <div className="citizen-card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '0.69rem', color: 'var(--text-muted, #64748B)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('feed.kpiResponse', 'Avg Dispatch Response')}
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-title, #0F172A)', marginTop: 2 }}>
                  1.4 hrs
                </div>
                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted, #64748B)', fontWeight: 500, marginTop: 2 }}>
                  {t('feed.kpiResponseSub', 'Triage to First Squad Movement')}
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="citizen-card" style={{ padding: '12px 16px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <input
                    type="text"
                    placeholder={t('feed.searchPlaceholder', 'Search complaints by keyword, area, ticket ID...')}
                    value={feedSearch}
                    onChange={(e) => setFeedSearch(e.target.value)}
                    className="citizen-input"
                    style={{ flex: 1, minWidth: 260, padding: '7px 12px' }}
                  />
                  <select
                    className="citizen-select"
                    value={feedFilterCategory}
                    onChange={(e) => setFeedFilterCategory(e.target.value)}
                    style={{ width: 220, padding: '7px 10px' }}
                  >
                    <option value="All">{t('feed.allCategories', 'All Issue Categories')}</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={fetchRecentFeed}
                  style={{
                    background: 'var(--card-bg, #FFFFFF)',
                    border: '1px solid var(--card-border, #CBD5E1)',
                    color: 'var(--text-body, #334155)',
                    borderRadius: 8,
                    padding: '7px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  {feedLoading ? t('common.loading', 'Refreshing...') : t('feed.refreshBtn', 'Refresh Live Feed')}
                </button>
              </div>
            </div>

            {/* Full-Screen Reports Grid */}
            <div className="citizen-feed-grid">
              {filteredFeed.map((item) => (
                <div key={item.id} className="citizen-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{
                        fontSize: '0.73rem',
                        fontWeight: 600,
                        color: '#2563EB',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        padding: '2px 7px',
                        borderRadius: 4,
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {item.ticket_number || item.id}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: item.status === 'Resolved' ? '#ECFDF5' : '#EFF6FF',
                        color: item.status === 'Resolved' ? '#047857' : '#1D4ED8',
                        border: item.status === 'Resolved' ? '1px solid #A7F3D0' : '1px solid #BFDBFE'
                      }}>
                        {getStatusLabel(item.status)}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: '0 0 4px 0' }}>
                      {item.title}
                    </h4>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted, #64748B)',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {item.description}
                    </div>

                    <div style={{ fontSize: '0.71rem', color: '#94A3B8', marginTop: 6 }}>
                      {item.landmark_address || item.ward_zone}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--card-border, #E2E8F0)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.73rem' }}>
                    <span style={{ color: 'var(--text-muted, #64748B)', fontWeight: 500 }}>
                      {t(`categories.${getCategoryKey(item.category)}.label`, item.category)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTrackSearchId(item.ticket_number || item.id);
                        setActiveNav('track');
                        handleTrackSearch(item.ticket_number || item.id);
                      }}
                      style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      {t('feed.trackAction', 'Track →')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: EMERGENCY HELPLINES (FULL SCREEN DIRECTORY & SOP MATRIX)     */}
        {/* =================================================================== */}
        {activeNav === 'emergency' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="citizen-card" style={{ padding: '14px 18px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: 0 }}>
                    {t('emergency.title', '24x7 Municipal Rapid Action Helplines')}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748B)', margin: '2px 0 0 0' }}>
                    {t('emergency.subtitle', 'For immediate life-safety emergencies, arterial watermain ruptures, or fallen live electrical lines, contact dispatch teams directly.')}
                  </p>
                </div>
              </div>
            </div>

            <div className="citizen-helpline-grid">
              {/* BBMP */}
              <div className="citizen-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.69rem', fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase' }}>
                      {t('emergency.civicTag', 'Civic Infrastructure')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>
                      {t('emergency.active247', '24x7 Active')}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: '0 0 4px 0' }}>
                    {t('emergency.bbmpTitle', 'BBMP Central Control Room')}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.45 }}>
                    {t('emergency.bbmpDesc', 'Disaster triage, road cave-ins, fallen trees, and generalized urban infrastructure failures.')}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--card-border, #E2E8F0)', paddingTop: 8 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-title, #0F172A)' }}>
                    080-22221188
                  </div>
                  <a href="tel:08022221188" style={{ background: '#2563EB', color: '#FFFFFF', padding: '6px 14px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                    {t('emergency.callDispatch', 'Call Dispatch')}
                  </a>
                </div>
              </div>

              {/* BWSSB */}
              <div className="citizen-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.69rem', fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase' }}>
                      {t('emergency.waterTag', 'Water & Pipeline')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>
                      {t('emergency.active247', '24x7 Active')}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: '0 0 4px 0' }}>
                    {t('emergency.bwssbTitle', 'BWSSB Water & Pipeline Emergency')}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.45 }}>
                    {t('emergency.bwssbDesc', 'High-pressure pipeline burst, sewage overflow, valve rupture, and drinking water contamination.')}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--card-border, #E2E8F0)', paddingTop: 8 }}>
                  <div className="notranslate" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-title, #0F172A)' }}>
                    1916 / 080-22238888
                  </div>
                  <a href="tel:1916" style={{ background: '#2563EB', color: '#FFFFFF', padding: '6px 14px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                    {t('emergency.call1916', 'Call 1916')}
                  </a>
                </div>
              </div>

              {/* BESCOM */}
              <div className="citizen-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.69rem', fontWeight: 600, color: '#D97706', background: '#FEF3C7', border: '1px solid #FDE68A', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase' }}>
                      {t('emergency.elecTag', 'Electrical Grid')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>
                      {t('emergency.active247', '24x7 Active')}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: '0 0 4px 0' }}>
                    {t('emergency.bescomTitle', 'BESCOM Electrical Emergency & Safety Desk')}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.45 }}>
                    {t('emergency.bescomDesc', 'Snapped live power lines, transformer fire, exposed pole cables, and blackouts.')}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--card-border, #E2E8F0)', paddingTop: 8 }}>
                  <div className="notranslate" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-title, #0F172A)' }}>
                    1912
                  </div>
                  <a href="tel:1912" style={{ background: '#2563EB', color: '#FFFFFF', padding: '6px 14px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                    {t('emergency.call1912', 'Call 1912')}
                  </a>
                </div>
              </div>

              {/* BTP */}
              <div className="citizen-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.69rem', fontWeight: 600, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase' }}>
                      {t('emergency.trafficTag', 'Traffic Obstruction')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>
                      {t('emergency.active247', '24x7 Active')}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: '0 0 4px 0' }}>
                    {t('emergency.btpTitle', 'Bengaluru Traffic Police Command')}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.45 }}>
                    {t('emergency.btpDesc', 'Traffic signal breakdown, vehicle pile-ups, spilled construction gravel, and gridlock.')}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--card-border, #E2E8F0)', paddingTop: 8 }}>
                  <div className="notranslate" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-title, #0F172A)' }}>
                    1095 / 080-22943030
                  </div>
                  <a href="tel:1095" style={{ background: '#2563EB', color: '#FFFFFF', padding: '6px 14px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                    {t('emergency.callTraffic', 'Call Traffic QRT')}
                  </a>
                </div>
              </div>

              {/* National SOS 112 */}
              <div className="citizen-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.69rem', fontWeight: 600, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase' }}>
                      {t('emergency.sosTag', 'National Emergency')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>
                      {t('emergency.sosActive', 'National SOS')}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: '0 0 4px 0' }}>
                    {t('emergency.sosTitle', 'Unified Emergency Response (ERSS 112)')}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.45 }}>
                    {t('emergency.sosDesc', 'Single unified toll-free contact for Police, Fire, Ambulance, and State Disaster Response Force (SDRF).')}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--card-border, #E2E8F0)', paddingTop: 8 }}>
                  <div className="notranslate" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: '#DC2626' }}>
                    112
                  </div>
                  <a href="tel:112" style={{ background: '#DC2626', color: '#FFFFFF', padding: '6px 14px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                    {t('emergency.callSos', 'Call 112')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: HELP & GUIDELINES (COMPREHENSIVE FULL-SCREEN CITIZEN CHARTER)*/}
        {/* =================================================================== */}
        {activeNav === 'help' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Full-Width Hero Charter Card */}
            <div className="citizen-card" style={{ width: '100%', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: 0 }}>
                    {t('help.heroTitle', 'Bengaluru Citizen Civic Redressal Charter & Service Standards')}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0' }}>
                    {t('help.heroDesc', 'UrbanPulse empowers every citizen of Bengaluru to report civic issues directly to municipal squad dispatchers with end-to-end accountability.')}
                  </p>
                </div>
              </div>
            </div>

            {/* Department SLA Turnaround Benchmarks - 6 Cards Grid */}
            <div style={{ width: '100%' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: '0 0 10px 0' }}>
                {t('help.slaTitle', 'Municipal Service Level Agreements (SLAs)')}
              </h4>
              <div className="citizen-sla-grid">
                <div className="citizen-card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <strong style={{ fontSize: '0.82rem', color: '#2563EB', fontWeight: 600 }}>{t('help.slaRoads', 'Roads & Potholes')}</strong>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#047857', background: '#ECFDF5', padding: '2px 7px', borderRadius: 4 }}>48 {t('common.hours', 'Hours')}</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.4 }}>
                    {t('help.slaRoadsDesc', 'Cold-mix patching and asphalt milling by BBMP Road Infrastructure Cell.')}
                  </p>
                </div>

                <div className="citizen-card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <strong style={{ fontSize: '0.82rem', color: '#2563EB', fontWeight: 600 }}>{t('help.slaGarbage', 'Garbage Blackspots')}</strong>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#047857', background: '#ECFDF5', padding: '2px 7px', borderRadius: 4 }}>24 {t('common.hours', 'Hours')}</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.4 }}>
                    {t('help.slaGarbageDesc', 'Compactor dispatch and sanitation sweep by Solid Waste Management (SWM).')}
                  </p>
                </div>

                <div className="citizen-card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <strong style={{ fontSize: '0.82rem', color: '#2563EB', fontWeight: 600 }}>{t('help.slaWater', 'Water Pipeline Leaks')}</strong>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#047857', background: '#ECFDF5', padding: '2px 7px', borderRadius: 4 }}>24 {t('common.hours', 'Hours')}</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.4 }}>
                    {t('help.slaWaterDesc', 'Acoustic leak detection and valve replacement by BWSSB Supply Division.')}
                  </p>
                </div>

                <div className="citizen-card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <strong style={{ fontSize: '0.82rem', color: '#2563EB', fontWeight: 600 }}>{t('help.slaDrainage', 'Drainage & Flooding')}</strong>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#047857', background: '#ECFDF5', padding: '2px 7px', borderRadius: 4 }}>12 {t('common.hours', 'Hours')}</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.4 }}>
                    {t('help.slaDrainageDesc', 'Emergency underpass suction de-watering and primary silt clearance.')}
                  </p>
                </div>

                <div className="citizen-card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <strong style={{ fontSize: '0.82rem', color: '#2563EB', fontWeight: 600 }}>{t('help.slaLighting', 'Streetlight Failures')}</strong>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#047857', background: '#ECFDF5', padding: '2px 7px', borderRadius: 4 }}>36 {t('common.hours', 'Hours')}</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.4 }}>
                    {t('help.slaLightingDesc', 'Hydraulic ladder pole maintenance and underground cable diagnosis by BESCOM.')}
                  </p>
                </div>

                <div className="citizen-card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <strong style={{ fontSize: '0.82rem', color: '#2563EB', fontWeight: 600 }}>{t('help.slaTraffic', 'Traffic Signal Hazards')}</strong>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#DC2626', background: '#FEF2F2', padding: '2px 7px', borderRadius: 4 }}>6 {t('common.hours', 'Hours')}</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', margin: 0, lineHeight: 1.4 }}>
                    {t('help.slaTrafficDesc', 'Immediate traffic obstruction towing and signal restoration by BTP QRT.')}
                  </p>
                </div>
              </div>
            </div>

            {/* 4-Step Resolution Lifecycle */}
            <div className="citizen-card" style={{ width: '100%', padding: '16px 20px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: '0 0 12px 0' }}>
                {t('help.stepsTitle', 'How Your Complaint Moves: 4-Step Action Path')}
              </h4>
              <div className="citizen-help-steps-grid">
                <div style={{ background: 'var(--bg-subtle, #F8FAFC)', padding: 12, borderRadius: 8, border: '1px solid var(--card-border, #E2E8F0)' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563EB', color: '#FFFFFF', fontSize: '0.74rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    1
                  </div>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-title, #0F172A)', fontWeight: 600 }}>{t('help.step1Title', 'Capture & Geotag')}</strong>
                  <p style={{ fontSize: '0.73rem', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0', lineHeight: 1.4 }}>
                    {t('help.step1Desc', 'Citizen pins the exact location and attaches photo evidence via the mobile-ready portal.')}
                  </p>
                </div>

                <div style={{ background: 'var(--bg-subtle, #F8FAFC)', padding: 12, borderRadius: 8, border: '1px solid var(--card-border, #E2E8F0)' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563EB', color: '#FFFFFF', fontSize: '0.74rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    2
                  </div>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-title, #0F172A)', fontWeight: 600 }}>{t('help.step2Title', 'Triage & Routing')}</strong>
                  <p style={{ fontSize: '0.73rem', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0', lineHeight: 1.4 }}>
                    {t('help.step2Desc', 'Automated rule engine classifies the category and assigns the ticket to the designated ward squad.')}
                  </p>
                </div>

                <div style={{ background: 'var(--bg-subtle, #F8FAFC)', padding: 12, borderRadius: 8, border: '1px solid var(--card-border, #E2E8F0)' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563EB', color: '#FFFFFF', fontSize: '0.74rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    3
                  </div>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-title, #0F172A)', fontWeight: 600 }}>{t('help.step3Title', 'Crew Field Dispatch')}</strong>
                  <p style={{ fontSize: '0.73rem', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0', lineHeight: 1.4 }}>
                    {t('help.step3Desc', 'Municipal response vehicle moves on site with vehicle number and live ETA logged.')}
                  </p>
                </div>

                <div style={{ background: 'var(--bg-subtle, #F8FAFC)', padding: 12, borderRadius: 8, border: '1px solid var(--card-border, #E2E8F0)' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#059669', color: '#FFFFFF', fontSize: '0.74rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    4
                  </div>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-title, #0F172A)', fontWeight: 600 }}>{t('help.step4Title', 'Verified Closure')}</strong>
                  <p style={{ fontSize: '0.73rem', color: 'var(--text-muted, #64748B)', margin: '3px 0 0 0', lineHeight: 1.4 }}>
                    {t('help.step4Desc', 'Authorized supervisor records closure notes and resolution photo. Citizen can reopen if needed.')}
                  </p>
                </div>
              </div>
            </div>

            {/* Dos and Don'ts Matrix */}
            <div className="citizen-dos-donts-grid">
              <div className="citizen-card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.7rem' }}>✓</span>
                  <strong style={{ fontSize: '0.86rem', color: 'var(--text-title, #0F172A)', fontWeight: 600 }}>{t('help.dosTitle', 'Best Practices (Do\'s)')}</strong>
                </div>
                <ul style={{ fontSize: '0.76rem', color: 'var(--text-body, #334155)', margin: 0, paddingLeft: 16, lineHeight: 1.55 }}>
                  <li>{t('help.do1', 'Capture both close-up damage and surrounding landmarks (e.g. metro pillar, street sign).')}</li>
                  <li>{t('help.do2', 'Click or drag the red pin to the exact coordinate rather than relying solely on area names.')}</li>
                  <li>{t('help.do3', 'Provide brief dimensions (e.g. 1m wide pothole, 20cm water depth) in the description.')}</li>
                  <li>{t('help.do4', 'Check existing community reports to see if the issue is already queued for repair.')}</li>
                </ul>
              </div>

              <div className="citizen-card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#FEF2F2', color: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.7rem' }}>✕</span>
                  <strong style={{ fontSize: '0.86rem', color: 'var(--text-title, #0F172A)', fontWeight: 600 }}>{t('help.dontsTitle', 'Common Errors (Don\'ts)')}</strong>
                </div>
                <ul style={{ fontSize: '0.76rem', color: 'var(--text-body, #334155)', margin: 0, paddingLeft: 16, lineHeight: 1.55 }}>
                  <li>{t('help.dont1', 'Don\'t upload blurry night photos without landmarks — teams may fail to locate the spot.')}</li>
                  <li>{t('help.dont2', 'Don\'t submit duplicate reports for the same issue in a short period; track the original ID.')}</li>
                  <li>{t('help.dont3', 'Don\'t report private property maintenance issues (only public infrastructure is serviced).')}</li>
                  <li>{t('help.dont4', 'For active fires or live electrical lines sparking, call hotlines immediately (1912 / 112).')}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Citizen Profile & Privacy Modal */}
        {showProfileModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}>
            <div className="citizen-card" style={{ width: 440, maxWidth: '90vw', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-title, #0F172A)', margin: 0 }}>
                  {t('common.profile', 'Citizen Profile & Contact Info')}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <div>
                  <label className="citizen-label">{t('common.profileName', 'Your Name')}</label>
                  <input
                    type="text"
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    className="citizen-input"
                  />
                </div>
                <div>
                  <label className="citizen-label">{t('common.profilePhone', 'Mobile Number (for SMS dispatch updates)')}</label>
                  <input
                    type="tel"
                    value={citizenPhone}
                    onChange={(e) => setCitizenPhone(e.target.value)}
                    className="citizen-input"
                  />
                </div>
                <div>
                  <label className="citizen-label">{t('common.profileEmail', 'Email Address')}</label>
                  <input
                    type="email"
                    value={citizenEmail}
                    onChange={(e) => setCitizenEmail(e.target.value)}
                    className="citizen-input"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="anon-toggle"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    style={{ accentColor: '#2563EB' }}
                  />
                  <label htmlFor="anon-toggle" style={{ fontSize: '0.75rem', color: 'var(--text-body, #334155)', fontWeight: 500, cursor: 'pointer' }}>
                    {t('common.profileAnon', 'Submit reports anonymously by default')}
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                {onLogout ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(false);
                      onLogout();
                    }}
                    style={{
                      background: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FECACA',
                      padding: '7px 14px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                ) : <div />}
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false);
                    showToast(t('common.profileSaved', 'Profile preferences saved'));
                  }}
                  style={{
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '7px 16px',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t('common.save', 'Save Preferences')}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Mobile Quick Bottom Navigation Dock */}
        <nav className="citizen-mobile-bottom-bar" aria-label="Mobile Navigation">
          <button
            type="button"
            className={`citizen-mobile-tab-btn ${activeNav === 'report' ? 'active' : ''}`}
            onClick={() => setActiveNav('report')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span className="citizen-mobile-tab-label">{t('nav.report', 'Report')}</span>
          </button>

          <button
            type="button"
            className={`citizen-mobile-tab-btn ${activeNav === 'track' ? 'active' : ''}`}
            onClick={() => setActiveNav('track')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="citizen-mobile-tab-label">{t('nav.track', 'Track')}</span>
          </button>

          <button
            type="button"
            className={`citizen-mobile-tab-btn ${activeNav === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveNav('feed')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="citizen-mobile-tab-label">{t('nav.feed', 'Feed')}</span>
          </button>

          <button
            type="button"
            className={`citizen-mobile-tab-btn ${activeNav === 'emergency' ? 'active' : ''}`}
            onClick={() => setActiveNav('emergency')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="citizen-mobile-tab-label">{t('nav.emergency', 'Helpline')}</span>
          </button>

          <button
            type="button"
            className={`citizen-mobile-tab-btn ${activeNav === 'help' ? 'active' : ''}`}
            onClick={() => setActiveNav('help')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span className="citizen-mobile-tab-label">{t('nav.help', 'Help')}</span>
          </button>
        </nav>
      </main>
    </div>
  );
}
