import { useState } from 'react';
import RegisterTypeDot from '../shared/RegisterTypeDot';

function StatsCard({title, value, type}) {
  const [isHovered, setIsHovered] = useState(false);

  const styles = {
    background: 'white',
    padding: '20px',
    border: '.5px solid rgb(219, 219, 219)',
    borderRadius: '12px',
    height: '90px',
    marginBottom: '20px',
    boxShadow: isHovered ? '4px 4px 8px 0px rgba(0, 0, 0, 0.15)' : '1px 1px 1px 0px rgba(0, 0, 0, 0.2)',
    // Se acomoda solo: crece hasta llenar el espacio y envuelve a 1 columna
    // en pantallas angostas sin necesidad de media queries.
    flex: '1 1 220px',
    boxSizing: 'border-box',
    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  }

  return (
    <article 
      style={styles}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2>{value}</h2>
      <p style={{margin: 0, color: 'gray', fontSize: '.9em'}}>
        {type && <RegisterTypeDot t={type} />}
        {title}
      </p>
    </article>
  )
}

export default StatsCard;