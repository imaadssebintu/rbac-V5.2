import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  Avatar,
  IconButton,
  Typography,
  TextField,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  Share,
  MoreVert,
  Bookmark,
  BookmarkBorder,
  Send,
  EmojiEmotions,
  LocationOn,
  Pets
} from '@mui/icons-material';
import EmojiPicker from 'emoji-picker-react';
import { socialAPI } from '../../services/api';

const SocialFeed = ({ userId }) => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, [userId]);

  const fetchPosts = async () => {
    try {
      const response = await socialAPI.getFeed(userId);
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleLike = async (postId) => {
    try {
      await socialAPI.likePost(postId, userId);
      fetchPosts();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (postId, comment) => {
    try {
      await socialAPI.addComment(postId, { userId, content: comment });
      fetchPosts();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleShare = async (postId) => {
    try {
      await socialAPI.sharePost(postId, userId);
      // In a real app, you might want to show sharing options
      navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !selectedImage) return;

    const postData = {
      content: newPost,
      image: selectedImage,
      userId,
      tags: extractTags(newPost),
      mentions: extractMentions(newPost)
    };

    try {
      await socialAPI.createPost(postData);
      setNewPost('');
      setSelectedImage(null);
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const extractTags = (text) => {
    const tags = text.match(/#[\w]+/g);
    return tags ? tags.map(tag => tag.substring(1)) : [];
  };

  const extractMentions = (text) => {
    const mentions = text.match(/@[\w]+/g);
    return mentions ? mentions.map(mention => mention.substring(1)) : [];
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const PostCard = ({ post }) => {
    const [comment, setComment] = useState('');
    const [showComments, setShowComments] = useState(false);

    return (
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={
            <Avatar src={post.user?.profilePicture}>
              {post.user?.name?.charAt(0)}
            </Avatar>
          }
          action={
            <IconButton onClick={(e) => {
              setAnchorEl(e.currentTarget);
              setSelectedPost(post);
            }}>
              <MoreVert />
            </IconButton>
          }
          title={post.user?.name}
          subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {post.location && (
                <>
                  <LocationOn sx={{ fontSize: 14 }} />
                  <Typography variant="caption">{post.location}</Typography>
                </>
              )}
              {post.pets && post.pets.length > 0 && (
                <>
                  <Pets sx={{ fontSize: 14 }} />
                  <Typography variant="caption">
                    {post.pets.join(', ')}
                  </Typography>
                </>
              )}
              <Typography variant="caption" color="text.secondary">
                {new Date(post.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
          }
        />

        {post.image && (
          <CardMedia
            component="img"
            height="400"
            image={post.image}
            alt="Post image"
          />
        )}

        <CardContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {post.content}
          </Typography>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {post.tags.map((tag, index) => (
                <Typography
                  key={index}
                  variant="caption"
                  sx={{
                    color: 'primary.main',
                    mr: 1,
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  #{tag}
                </Typography>
              ))}
            </Box>
          )}

          {/* Stats */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {post.likesCount} likes • {post.commentsCount} comments • {post.sharesCount} shares
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', borderTop: 1, borderBottom: 1, borderColor: 'divider', py: 1 }}>
            <Button
              fullWidth
              startIcon={post.isLiked ? <Favorite color="error" /> : <FavoriteBorder />}
              onClick={() => handleLike(post.id)}
              sx={{ color: post.isLiked ? 'error.main' : 'inherit' }}
            >
              Like
            </Button>

            <Button
              fullWidth
              startIcon={<ChatBubbleOutline />}
              onClick={() => setShowComments(!showComments)}
            >
              Comment
            </Button>

            <Button
              fullWidth
              startIcon={<Share />}
              onClick={() => handleShare(post.id)}
            >
              Share
            </Button>

            <Button
              fullWidth
              startIcon={post.isBookmarked ? <Bookmark /> : <BookmarkBorder />}
            >
              Save
            </Button>
          </Box>

          {/* Comments Section */}
          {showComments && (
            <Box sx={{ mt: 2 }}>
              {post.comments?.slice(0, 3).map((comment) => (
                <Box key={comment.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Avatar sx={{ width: 24, height: 24 }}>
                    {comment.user?.name?.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2">
                      <strong>{comment.user?.name}</strong> {comment.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                </Box>
              ))}

              {/* Add Comment */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Avatar sx={{ width: 32, height: 32 }}>
                  {userId?.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id, comment)}
                  />
                  <IconButton
                    size="small"
                    sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                    onClick={() => setShowEmojiPicker(true)}
                  >
                    <EmojiEmotions />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ maxWidth: 600, margin: '0 auto', p: 2 }}>
      {/* Create Post Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Avatar src={userId?.profilePicture}>
              {userId?.name?.charAt(0)}
            </Avatar>
            <TextField
              fullWidth
              multiline
              placeholder="Share your trip experience..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              maxRows={4}
            />
          </Box>

          {selectedImage && (
            <Box sx={{ position: 'relative', mb: 2 }}>
              <Box
                component="img"
                src={selectedImage}
                alt="Selected"
                sx={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 1 }}
              />
              <IconButton
                sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
                onClick={() => setSelectedImage(null)}
              >
                <MoreVert />
              </IconButton>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload"
                type="file"
                onChange={handleImageUpload}
              />
              <label htmlFor="image-upload">
                <IconButton component="span">
                  <CardMedia />
                </IconButton>
              </label>

              <IconButton onClick={() => setShowEmojiPicker(true)}>
                <EmojiEmotions />
              </IconButton>

              <IconButton>
                <LocationOn />
              </IconButton>

              <IconButton>
                <Pets />
              </IconButton>
            </Box>

            <Button
              variant="contained"
              onClick={handleCreatePost}
              disabled={!newPost.trim() && !selectedImage}
            >
              Post
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Emoji Picker Dialog */}
      <Dialog open={showEmojiPicker} onClose={() => setShowEmojiPicker(false)}>
        <DialogContent>
          <EmojiPicker
            onEmojiClick={(emojiObject) => {
              setNewPost(prev => prev + emojiObject.emoji);
              setShowEmojiPicker(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Post Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {selectedPost?.userId === userId ? (
          [
            <MenuItem key="edit">Edit</MenuItem>,
            <MenuItem key="delete" sx={{ color: 'error.main' }}>Delete</MenuItem>,
            <MenuItem key="archive">Archive</MenuItem>
          ]
        ) : (
          [
            <MenuItem key="report">Report</MenuItem>,
            <MenuItem key="unfollow">Unfollow</MenuItem>,
            <MenuItem key="block">Block</MenuItem>
          ]
        )}
      </Menu>
    </Box>
  );
};

export default SocialFeed;
