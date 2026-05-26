import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardMedia,
  CardActions,
  Avatar,
  IconButton,
  Typography,
  Box,
  Chip,
  Menu,
  MenuItem,
  TextField,
  Button
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  Share,
  Bookmark,
  BookmarkBorder,
  MoreVert,
  Send,
  LocationOn,
  Pets,
  EmojiEmotions
} from '@mui/icons-material';
import { socialAPI } from '../../services/api';

const PostCard = ({ post, onLike, onBookmark, onShare, onComment }) => {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [comments, setComments] = useState(post.comments || []);

  const handleLike = async () => {
    try {
      if (onLike) {
        onLike(post.id);
      } else {
        await socialAPI.likePost(post.id, post.userId);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      if (onBookmark) {
        onBookmark(post.id);
      }
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error('Error bookmarking post:', error);
    }
  };

  const handleShare = async () => {
    try {
      if (onShare) {
        onShare(post.id);
      } else {
        await socialAPI.sharePost(post.id, post.userId);
        navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;

    try {
      const newComment = {
        id: Date.now(),
        content: comment,
        user: { id: post.userId, name: 'You' },
        createdAt: new Date().toISOString()
      };

      if (onComment) {
        onComment(post.id, comment);
      } else {
        await socialAPI.addComment(post.id, { userId: post.userId, content: comment });
      }

      setComments([newComment, ...comments]);
      setComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      // API call to delete post
      setAnchorEl(null);
    }
  };

  const handleReport = () => {
    // API call to report post
    setAnchorEl(null);
    alert('Post reported successfully');
  };

  return (
    <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
      {/* Header */}
      <CardHeader
        avatar={
          <Avatar src={post.user?.profilePicture}>
            {post.user?.name?.charAt(0)}
          </Avatar>
        }
        action={
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVert />
          </IconButton>
        }
        title={
          <Typography variant="subtitle1" fontWeight="bold">
            {post.user?.name}
          </Typography>
        }
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
                <Pets sx={{ fontSize: 14, ml: 1 }} />
                <Typography variant="caption">
                  {post.pets.join(', ')}
                </Typography>
              </>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              • {new Date(post.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        }
      />

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <CardMedia
          component="img"
          height="400"
          image={post.images[0]}
          alt="Post image"
          sx={{ objectFit: 'cover' }}
        />
      )}

      {/* Content */}
      <CardContent>
        <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
          {post.content}
        </Typography>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {post.tags.map((tag, index) => (
              <Chip
                key={index}
                label={`#${tag}`}
                size="small"
                sx={{ mr: 0.5, mb: 0.5, cursor: 'pointer' }}
                onClick={() => console.log('Search tag:', tag)}
              />
            ))}
          </Box>
        )}

        {/* Stats */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {post.likesCount || 0} likes • {post.commentsCount || comments.length} comments • {post.sharesCount || 0} shares
          </Typography>
        </Box>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ justifyContent: 'space-around', py: 1, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        <IconButton
          onClick={handleLike}
          sx={{ color: isLiked ? 'error.main' : 'inherit' }}
        >
          {isLiked ? <Favorite /> : <FavoriteBorder />}
          <Typography variant="caption" sx={{ ml: 1 }}>
            Like
          </Typography>
        </IconButton>

        <IconButton onClick={() => setShowComments(!showComments)}>
          <ChatBubbleOutline />
          <Typography variant="caption" sx={{ ml: 1 }}>
            Comment
          </Typography>
        </IconButton>

        <IconButton onClick={handleShare}>
          <Share />
          <Typography variant="caption" sx={{ ml: 1 }}>
            Share
          </Typography>
        </IconButton>

        <IconButton onClick={handleBookmark}>
          {isBookmarked ? <Bookmark /> : <BookmarkBorder />}
        </IconButton>
      </CardActions>

      {/* Comments Section */}
      {showComments && (
        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
          {/* Comments List */}
          {comments.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {comments.slice(0, 3).map((commentItem) => (
                <Box key={commentItem.id} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {commentItem.user?.name?.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">
                        <strong>{commentItem.user?.name}</strong> {commentItem.content}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(commentItem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}

              {comments.length > 3 && (
                <Button size="small" sx={{ mb: 2 }}>
                  Show {comments.length - 3} more comments
                </Button>
              )}
            </Box>
          )}

          {/* Add Comment */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32 }}>
              You
            </Avatar>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
              />
              <IconButton
                size="small"
                sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
              >
                <EmojiEmotions />
              </IconButton>
            </Box>
            <IconButton
              onClick={handleComment}
              disabled={!comment.trim()}
            >
              <Send />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Post Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {post.userId === 'current-user-id' ? (
          [
            <MenuItem key="edit">Edit Post</MenuItem>,
            <MenuItem key="delete" sx={{ color: 'error.main' }} onClick={handleDelete}>
              Delete Post
            </MenuItem>,
            <MenuItem key="archive">Archive</MenuItem>
          ]
        ) : (
          [
            <MenuItem key="report" onClick={handleReport}>Report Post</MenuItem>,
            <MenuItem key="save">Save Post</MenuItem>,
            <MenuItem key="unfollow">Unfollow User</MenuItem>,
            <MenuItem key="block">Block User</MenuItem>
          ]
        )}
      </Menu>
    </Card>
  );
};

export default PostCard;
