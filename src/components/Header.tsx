import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';
import ProfileIcon from '../assets/profile.svg';
import LogoutIcon from '../assets/logout.svg';
import DropdownIcon from '../assets/dropdown.svg';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    signOut();
  };

  return (
    <div className="header">
      <div className="header-content">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        <div className="header-user" onClick={toggleDropdown}>
          <img src={ProfileIcon} alt="Profile" className="header-user-icon" />
          <span className="header-user-name">{user?.email || 'Ankit Mungra'}</span>
          <img src={DropdownIcon} alt="Dropdown" className={`dropdown-icon ${isDropdownOpen ? 'open' : ''}`} />
        </div>

        <div className={`dropdown-menu${isDropdownOpen ? ' open' : ''}`}>
          <button type="button" className="dropdown-item" onClick={handleLogout}>
            <img src={LogoutIcon} alt="Logout" className="dropdown-item-icon" />
            <span className="dropdown-item-text">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
