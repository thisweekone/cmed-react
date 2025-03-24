import { Chart, LineController, BarController, LineElement, BarElement, PointElement, ArcElement, 
          ScatterController, BubbleController, 
          LinearScale, CategoryScale, TimeScale, LogarithmicScale, RadialLinearScale,
          Tooltip, Title, Legend, Filler } from 'chart.js';

// Registrar os componentes do Chart.js
Chart.register(
  LineController, BarController, ScatterController, BubbleController,
  LineElement, BarElement, PointElement, ArcElement,
  LinearScale, CategoryScale, TimeScale, LogarithmicScale, RadialLinearScale,
  Tooltip, Legend, Title, Filler
);

// Configuração global do Chart.js
Chart.defaults.font.family = "'Roboto', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#666';
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
Chart.defaults.plugins.tooltip.titleFont = { weight: 'bold' };
Chart.defaults.plugins.tooltip.cornerRadius = 4;
Chart.defaults.plugins.legend.position = 'top';
Chart.defaults.elements.line.tension = 0.4;
Chart.defaults.elements.line.borderWidth = 2;
Chart.defaults.elements.point.radius = 3;
Chart.defaults.elements.point.hoverRadius = 5;
