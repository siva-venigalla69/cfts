import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Avatar, Button, Card, Title, Paragraph, Divider } from 'react-native-paper';
import { useAuthUser, useAuthActions } from '../../store/authStore';
import { theme } from '../../theme/theme';

const ProfileScreen = () => {
  const user = useAuthUser();
  const { logout } = useAuthActions();

  if (!user) {
    // This should not happen if the user is seeing this screen, but as a fallback
    return (
      <View style={styles.container}>
        <Title>Not logged in</Title>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card>
        <Card.Content style={styles.cardContent}>
          <Avatar.Text size={80} label={user.username.charAt(0).toUpperCase()} style={styles.avatar} />
          <Title style={styles.username}>{user.username}</Title>
          <Paragraph style={styles.status}>
            {user.is_admin ? 'Administrator' : 'User'} - {user.is_approved ? 'Approved' : 'Pending Approval'}
          </Paragraph>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={logout}
        style={styles.logoutButton}
        icon="logout"
      >
        Logout
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  cardContent: {
    alignItems: 'center',
  },
  avatar: {
    marginBottom: 16,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 16,
    color: theme.colors.placeholder,
    marginBottom: 24,
  },
  logoutButton: {
    marginTop: 32,
  },
});

export default ProfileScreen; 