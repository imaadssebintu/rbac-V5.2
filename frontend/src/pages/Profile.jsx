import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Tabs,
  Tab,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  LinearProgress,
  Divider,
  Stack
} from '@mui/material';
import {
  Edit,
  Share,
  Bookmark,
  LocationOn,
  CalendarToday,
  Pets,
  Star,
  AttachMoney,
  Delete,
  Instagram,
  Facebook,
  Twitter,
  Email,
  VerifiedUser,
  CloudUpload
} from '@mui/icons-material';
import ImageUpload from '../components/common/ImageUpload';
import Itinerary from '../components/travel/Itinerary';
import ScheduleCalendar from '../components/schedule/ScheduleCalendar';
import { profileAPI, BACKEND_ORIGIN } from '../services/api';

const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;

  try {
    return new URL(url, BACKEND_ORIGIN).toString();
  } catch (error) {
    return url;
  }
};

const getCertificateUrl = (cert) => {
  if (!cert) return '';
  if (typeof cert === 'string') return resolveAssetUrl(cert);
  return resolveAssetUrl(cert.file_url || cert.url || cert.path || '');
};

const getCertificateLabel = (cert, index) => {
  if (!cert) return `Certificate ${index + 1}`;
  if (typeof cert === 'string') return `Certificate ${index + 1}`;
  return cert.name || cert.title || cert.original_name || `Certificate ${index + 1}`;
};

const isImageFile = (fileUrl) => /\.(jpg|jpeg|png|gif|webp)$/i.test(String(fileUrl || ''));

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [certifications, setCertifications] = useState([]);
  const [isCertified, setIsCertified] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [certUploading, setCertUploading] = useState(false);
  const [certError, setCertError] = useState('');
  const [galleryError, setGalleryError] = useState('');
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const role = (user?.role || '').toLowerCase();
  const isGuide = role === 'walker';
  const isGuideVerified = Boolean(user?.isVerified || user?.is_verified);
  const verifiedCertificateUrl = resolveAssetUrl(user?.certificateUrl || '');
  const roleLabel = role === 'walker' ? 'Guide' : role === 'walkee' ? 'Traveler' : user?.role;
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    email: user?.email || '',
    phone: user?.phone || '',
    social: user?.social_links || {
      instagram: '',
      twitter: ''
    }
  });

  const stats = {
    walks: 128,
    rating: 4.8,
    earnings: 2450,
    pets: 12,
    followers: 342,
    following: 156
  };

  const recentActivity = [
    { id: 1, type: 'walk', description: 'Guided a city trip in Central Park', time: '2 hours ago' },
    { id: 2, type: 'review', description: 'Received 5-star review from Sarah', time: '1 day ago' },
    { id: 3, type: 'post', description: 'Posted about pet safety tips', time: '2 days ago' },
  ];

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        email: user.email || '',
        phone: user.phone || '',
        social: user.social_links || { instagram: '', twitter: '' }
      });
      setCertifications(Array.isArray(user.certifications) ? user.certifications : []);
      setIsCertified(Boolean(user.is_certified));
      setGalleryImages(Array.isArray(user.gallery) ? user.gallery : []);
    }
  }, [user]);

  const handleCertificateUpload = async () => {
    if (!user || !selectedCertificate) return;

    const allowedCertTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedCertTypes.includes(selectedCertificate.type)) {
      setCertError('Certificates must be PDF, JPG, or PNG files.');
      return;
    }

    if (selectedCertificate.size > 8 * 1024 * 1024) {
      setCertError('Certificate size must be 8MB or less.');
      return;
    }

    setCertUploading(true);
    setCertError('');
    try {
      const response = await profileAPI.uploadCertificate(user.id, selectedCertificate);
      setCertifications(response.data.certifications || []);
      setIsCertified(Boolean(response.data.is_certified));
      setSelectedCertificate(null);
    } catch (error) {
      setCertError(error.response?.data?.message || 'Failed to upload certificate.');
    } finally {
      setCertUploading(false);
    }
  };

  const handleDeleteCertificate = async (cert) => {
    if (!user) return;

    const certIdentifier = typeof cert === 'string'
      ? cert
      : (cert?.id || cert?.file_url || cert?.url || cert?.path || '');

    if (!certIdentifier) {
      alert('Unable to identify this certificate for deletion.');
      return;
    }

    if (!window.confirm('Delete this certificate permanently?')) return;

    try {
      const response = await profileAPI.deleteCertificate(user.id, certIdentifier);
      setCertifications(response.data.certifications || []);
      setIsCertified(Boolean(response.data.is_certified));
    } catch (error) {
      console.error('Failed to delete certificate:', error);
      alert(error.response?.data?.message || 'Failed to delete certificate.');
    }
  };

  const handleSaveProfile = async () => {
    try {
      await profileAPI.update(user.id, {
        name: profileData.name,
        bio: profileData.bio,
        location: profileData.location,
        email: profileData.email,
        phone: profileData.phone,
        social_links: profileData.social
      });
      setEditMode(false);
      alert('Profile updated successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile.');
    }
  };

  const handleGalleryUpload = async (file) => {
    if (!file || galleryUploading) return;
    setGalleryError('');

    const allowedGalleryTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedGalleryTypes.includes(file.type)) {
      setGalleryError('Only JPG, PNG, GIF, or WEBP photos are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setGalleryError('Photo size must be 5MB or less.');
      return;
    }

    setGalleryUploading(true);
    try {
      const response = await profileAPI.uploadGalleryImage(user.id, file);
      setGalleryImages(response.data.gallery || []);
    } catch (error) {
      console.error('Gallery upload failed', error);
      setGalleryError(error.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setGalleryUploading(false);
    }
  };

  const isPdfFile = (fileUrl) => String(fileUrl || '').toLowerCase().endsWith('.pdf');

  const handleDeleteGalleryImage = async (imageUrl) => {
    if(!window.confirm('Delete this image?')) return;
    try {
      const response = await profileAPI.deleteGalleryImage(user.id, imageUrl);
      setGalleryImages(response.data.gallery || []);
    } catch (error) {
      console.error('Delete failed', error);
      alert('Failed to delete image');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Profile Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            {/* Profile Picture & Basic Info */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ImageUpload
                  initialImage={user?.profile_image || user?.profilePicture}
                  type="profile"
                  circular={true}
                  uploadUrl="/upload"
                  fieldName="profilePic"
                  onUploadComplete={async (url) => {
                    if (!url) {
                      await profileAPI.deleteProfileImage(user.id);
                      await refreshUser?.();
                      return;
                    }

                    console.log('Profile image uploaded successfully:', url);
                    await refreshUser?.();
                  }}
                />
                <Typography variant="h5" sx={{ mt: 2, fontWeight: 'bold' }}>
                  {profileData.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isGuide ? 'Professional Guide' : 'Traveler'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip label={roleLabel} size="small" color="primary" />
                  <Chip icon={<LocationOn />} label={profileData.location} size="small" />
                  {isGuide && isGuideVerified && (
                    <Chip
                      icon={<VerifiedUser />}
                      label="Verified Guide"
                      size="small"
                      color="success"
                    />
                  )}
                </Box>
              </Box>
            </Grid>

            {/* Stats */}
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                {Object.entries(stats).map(([key, value]) => (
                  <Box key={key} sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">{value}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Bio */}
              <Typography variant="body1" paragraph>
                {profileData.bio}
              </Typography>

              {/* Contact & Social */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button startIcon={<Email />} size="small">
                  {profileData.email}
                </Button>
                {profileData.phone && (
                  <Button startIcon={<AttachMoney />} size="small"> {/* Using AttachMoney as placeholder, should use Phone */}
                    {profileData.phone}
                  </Button>
                )}
                <Button startIcon={<Instagram />} size="small">
                  {profileData.social.instagram}
                </Button>
                <Button startIcon={<Twitter />} size="small">
                  {profileData.social.twitter}
                </Button>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={() => setEditMode(true)}
                >
                  Edit Profile
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<Share />}
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: profileData.name,
                        text: profileData.bio,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Profile URL copied to clipboard!');
                    }
                  }}
                >
                  Share
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<Bookmark />}
                  onClick={() => alert('Profile saved to your bookmarks!')}
                >
                  Save
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Activity" />
              <Tab label="Itinerary" />
              <Tab label="Reviews" />
              <Tab label="Photos" />
              <Tab label="Schedule" />
              <Tab label="Settings" />
            </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Recent Activity */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                {recentActivity.map(activity => (
                  <Box
                    key={activity.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 2,
                      borderBottom: 1,
                      borderColor: 'divider'
                    }}
                  >
                    <Avatar sx={{ width: 40, height: 40, mr: 2 }}>
                      {activity.type === 'walk' ? <Pets /> : <Star />}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1">{activity.description}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activity.time}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  This Month
                </Typography>
                <Box sx={{ '& > *': { mb: 2 } }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Walks Completed
                    </Typography>
                    <Typography variant="h5">18</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Earnings
                    </Typography>
                    <Typography variant="h5">$850</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Avg. Rating
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Star sx={{ color: 'gold', mr: 0.5 }} />
                      <Typography variant="h5">4.9</Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
            
            {isGuide && (
             <Card sx={{ mt: 3 }}>
               <CardContent>
                 <Typography variant="h6" gutterBottom>
                   Certifications
                 </Typography>
                 <Stack spacing={2}>
                   <Box>
                     <Typography variant="body2" color="text.secondary">
                       Status
                     </Typography>
                     <Chip
                       icon={<VerifiedUser />}
                       label={isCertified ? 'Certified' : 'Pending certification'}
                       color={isCertified ? 'success' : 'default'}
                       size="small"
                     />
                   </Box>

                   <Box>
                     <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                       Upload certificate
                     </Typography>
                     <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                       Allowed: PDF, JPG, PNG • Max size: 8MB
                     </Typography>
                     <Button
                       variant="outlined"
                       component="label"
                       startIcon={<CloudUpload />}
                       disabled={certUploading}
                       fullWidth
                     >
                       Choose file
                       <input
                         type="file"
                         hidden
                         disabled={galleryUploading}
                         accept="application/pdf,image/jpeg,image/png"
                         onChange={(event) => setSelectedCertificate(event.target.files?.[0] || null)}
                       />
                     </Button>
                     {selectedCertificate && (
                       <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                         {selectedCertificate.name}
                       </Typography>
                     )}
                     <Button
                       variant="contained"
                       sx={{ mt: 2 }}
                       onClick={handleCertificateUpload}
                       disabled={!selectedCertificate || certUploading}
                       fullWidth
                     >
                       {certUploading ? <CircularProgress size={20} /> : 'Upload'}
                     </Button>
                     {certError && (
                       <Alert severity="error" sx={{ mt: 2 }}>
                         {certError}
                       </Alert>
                     )}
                   </Box>

                   <Divider />

                   {isGuideVerified && verifiedCertificateUrl && (
                     <Box>
                       <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                         Verified certificate
                       </Typography>
                       <Button
                         variant="outlined"
                         size="small"
                         href={verifiedCertificateUrl}
                         target="_blank"
                         rel="noreferrer"
                       >
                         Download certificate
                       </Button>
                     </Box>
                   )}

                   <Divider />

                   <Box>
                     <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                       Submitted certificates
                     </Typography>
                     {certifications.length === 0 ? (
                       <Typography variant="caption" color="text.secondary">
                         No certificates uploaded yet.
                       </Typography>
                     ) : (
                       <Stack spacing={1}>
                         {certifications.map((cert, index) => (
                           <Box key={cert.id || index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                             <Box>
                               <Typography variant="body2">
                                 {getCertificateLabel(cert, index)}
                               </Typography>
                               {cert.status && (
                                 <Typography variant="caption" color="text.secondary">
                                   {cert.status}
                                 </Typography>
                               )}
                             </Box>
                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                               {getCertificateUrl(cert) && (
                                 <Button
                                   size="small"
                                   href={getCertificateUrl(cert)}
                                   target="_blank"
                                   rel="noreferrer"
                                 >
                                   {isImageFile(getCertificateUrl(cert)) ? 'View Image' : 'Open'}
                                 </Button>
                               )}
                               <IconButton size="small" color="error" onClick={() => handleDeleteCertificate(cert)}>
                                 <Delete fontSize="small" />
                               </IconButton>
                             </Box>
                           </Box>
                         ))}
                       </Stack>
                     )}
                   </Box>
                 </Stack>
               </CardContent>
             </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Itinerary Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
             <Itinerary userId={user.id} />
          </CardContent>
        </Card>
      )}

      {/* Reviews - Placeholder */}
      {activeTab === 2 && (
         <Card><CardContent><Typography>Reviews section coming soon.</Typography></CardContent></Card>
      )}

      {/* Photos */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Photo Gallery</Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUpload />}
                disabled={galleryUploading}
              >
                Upload Photo
                <input
                  type="file"
                  hidden
                  disabled={galleryUploading}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => handleGalleryUpload(e.target.files[0])}
                />
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Allowed: JPG, PNG, GIF, WEBP • Max size: 5MB
            </Typography>

            {galleryError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {galleryError}
              </Alert>
            )}
            
            {galleryUploading && <LinearProgress sx={{ mb: 2 }} />}
            
            {galleryImages.length === 0 ? (
               <Alert severity="info">No gallery files yet. Share your moments and documents.</Alert>
            ) : (
               <Grid container spacing={2}>
                 {galleryImages.map((imgUrl, index) => {
                   const resolvedImgUrl = resolveAssetUrl(imgUrl);

                   return (
                   <Grid item xs={6} sm={4} md={3} key={index}>
                     <Box sx={{ position: 'relative', paddingTop: '100%', borderRadius: 1, overflow: 'hidden' }}>
                       {isPdfFile(resolvedImgUrl) ? (
                         <Box
                           sx={{
                             position: 'absolute',
                             top: 0,
                             left: 0,
                             width: '100%',
                             height: '100%',
                             bgcolor: 'background.default',
                             border: '1px dashed',
                             borderColor: 'divider',
                             display: 'flex',
                             flexDirection: 'column',
                             alignItems: 'center',
                             justifyContent: 'center',
                             p: 1,
                             textAlign: 'center'
                           }}
                         >
                           <Typography variant="subtitle2">PDF</Typography>
                           <Button size="small" href={resolvedImgUrl} target="_blank" rel="noreferrer">Open</Button>
                         </Box>
                       ) : (
                         <Box
                           component="img"
                           src={resolvedImgUrl}
                           alt={`Gallery ${index}`}
                           onError={(event) => {
                             event.currentTarget.src = 'https://via.placeholder.com/300x300?text=Image+Unavailable';
                           }}
                           sx={{
                             position: 'absolute',
                             top: 0,
                             left: 0,
                             width: '100%',
                             height: '100%',
                             objectFit: 'cover'
                           }}
                         />
                       )}
                       <IconButton
                         size="small"
                         sx={{
                           position: 'absolute',
                           top: 4,
                           right: 4,
                           bgcolor: 'rgba(255,255,255,0.7)',
                           '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                         }}
                         onClick={() => handleDeleteGalleryImage(imgUrl)}
                       >
                         <Delete fontSize="small" color="error" />
                       </IconButton>
                     </Box>
                   </Grid>
                 );})}
               </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule Tab */}
      {activeTab === 4 && (
        <Card>
          <CardContent>
             <ScheduleCalendar userId={user.id} role={role} />
          </CardContent>
        </Card>
      )}

      {/* Settings Tab - Placeholder */}
      {activeTab === 5 && (
         <Card><CardContent><Typography>Use the global settings page for account preferences.</Typography></CardContent></Card>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={editMode} onClose={() => setEditMode(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Name"
              value={profileData.name}
              onChange={(e) => setProfileData({...profileData, name: e.target.value})}
              fullWidth
              autoComplete="off"
            />
            <TextField
              label="Bio"
              multiline
              rows={3}
              value={profileData.bio}
              onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
              fullWidth
              autoComplete="off"
            />
            <TextField
              label="Location"
              value={profileData.location}
              onChange={(e) => setProfileData({...profileData, location: e.target.value})}
              fullWidth
              autoComplete="off"
            />
            <TextField
              label="Email"
              value={profileData.email}
              onChange={(e) => setProfileData({...profileData, email: e.target.value})}
              fullWidth
              autoComplete="off"
            />
            <TextField
              label="Phone Number"
              value={profileData.phone}
              onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
              fullWidth
              autoComplete="off"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMode(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProfile}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
