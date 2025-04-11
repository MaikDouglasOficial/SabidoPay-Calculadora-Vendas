import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';

type Parcela = { jrdia: number; pmeta: number };
type TabelaType = 'c' | 'm';
type Parcelas = { [key: string]: Parcela };
type ResultadoParcela = { entrada: string; parcelas: string; valor: string };

const parcelas: Parcelas = {
  '1+2X': { jrdia: 13, pmeta: 6.5 }, '1+3X': { jrdia: 17, pmeta: 8.5 },
  '1+4X': { jrdia: 21, pmeta: 10.5 }, '1+5X': { jrdia: 25, pmeta: 12.5 },
  '1+6X': { jrdia: 29, pmeta: 14.5 }, '1+7X': { jrdia: 33, pmeta: 16.5 },
  '1+8X': { jrdia: 37, pmeta: 18.5 }, '1+9X': { jrdia: 41, pmeta: 20.5 },
  '1+10X': { jrdia: 45, pmeta: 22.5 }, '1+11X': { jrdia: 49, pmeta: 24.5 },
  '1+12X': { jrdia: 53, pmeta: 26.5 }, '1+13X': { jrdia: 57, pmeta: 28.5 },
  '1+14X': { jrdia: 61, pmeta: 30.5 }, '1+15X': { jrdia: 65, pmeta: 32.5 },
  '1+16X': { jrdia: 69, pmeta: 34.5 }, '1+17X': { jrdia: 73, pmeta: 36.5 },
  '1+18X': { jrdia: 77, pmeta: 38.5 }, '1+19X': { jrdia: 81, pmeta: 40.5 },
  '1+20X': { jrdia: 85, pmeta: 42.5 }, '1+21X': { jrdia: 89, pmeta: 44.5 },
  '1+22X': { jrdia: 93, pmeta: 46.5 }, '1+23X': { jrdia: 97, pmeta: 48.5 },
  '1+24X': { jrdia: 101, pmeta: 50.5 },
};

const JurosCalculatorScreen = () => {
  const [valorProduto, setValorProduto] = useState('0');
  const [selectedTabela, setSelectedTabela] = useState<TabelaType>('c');
  const [resultado, setResultado] = useState<ResultadoParcela[]>([]);
  const [temEntrada, setTemEntrada] = useState(false);
  const [valorEntrada, setValorEntrada] = useState('');
  const [loading, setLoading] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcOperator, setCalcOperator] = useState<string | null>(null);
  const [calcPreviousValue, setCalcPreviousValue] = useState<string | null>(null);
  const [calcWaitingForOperand, setCalcWaitingForOperand] = useState(false);

  useEffect(() => { setValorProduto(calcDisplay); }, [calcDisplay]);

  const handleCalcNumberInput = (num: string) => {
    if (calcWaitingForOperand) { setCalcDisplay(num); setCalcWaitingForOperand(false); }
    else if (calcDisplay.length < 15) { setCalcDisplay(calcDisplay === '0' ? num : calcDisplay + num); }
  };
  const handleCalcDecimalInput = () => {
    if (calcWaitingForOperand) { setCalcDisplay('0.'); setCalcWaitingForOperand(false); }
    else if (!calcDisplay.includes('.') && calcDisplay.length < 15) { setCalcDisplay(calcDisplay + '.'); }
  };
  const performCalculation = () => {
    const currentValue = parseFloat(calcDisplay); const previousValue = parseFloat(calcPreviousValue ?? '0');
    if (calcOperator && calcPreviousValue !== null && !isNaN(currentValue) && !isNaN(previousValue)) {
      let result = 0;
      switch (calcOperator) {
        case '+': result = previousValue + currentValue; break;
        case '-': result = previousValue - currentValue; break;
        case '*': result = previousValue * currentValue; break;
        case '/': if (currentValue === 0) { Alert.alert("Erro", "Divisão por zero."); return NaN; } result = previousValue / currentValue; break;
        default: return currentValue;
      }
      const resultString = String(parseFloat(result.toPrecision(12))); setCalcDisplay(resultString); return parseFloat(resultString);
    } return isNaN(currentValue) ? 0 : currentValue;
  };
  const handleCalcOperatorInput = (op: string) => {
    const currentValueStr = calcDisplay;
    if (calcOperator && !calcWaitingForOperand) { const intermediateResult = performCalculation(); if (isNaN(intermediateResult)) return; setCalcPreviousValue(String(intermediateResult)); }
    else { const currentValueNum = parseFloat(currentValueStr); setCalcPreviousValue(!isNaN(currentValueNum) ? currentValueStr : '0'); }
    setCalcOperator(op); setCalcWaitingForOperand(true);
  };
  const handleCalcEquals = () => {
    const resultValue = performCalculation(); if (isNaN(resultValue)) return;
    setCalcOperator(null); setCalcPreviousValue(null); setCalcWaitingForOperand(false);
  };
  const clearCalculator = () => { setCalcDisplay('0'); setCalcOperator(null); setCalcPreviousValue(null); setCalcWaitingForOperand(false); };
  const handleBackspace = () => {
    if (calcWaitingForOperand) { return; }
    if (calcDisplay.length > 1) { setCalcDisplay(calcDisplay.slice(0, -1)); } else if (calcDisplay !== '0') { setCalcDisplay('0'); }
  };

  const calcularParcela = () => {
    Keyboard.dismiss(); setLoading(true); let valorInicial = 0;
    try { const parsedValue = parseFloat(valorProduto); if (isNaN(parsedValue)) throw new Error("Valor inválido."); valorInicial = Math.max(0, parsedValue); }
    catch (error: any) { setLoading(false); Alert.alert("Erro", error?.message || "Erro ao ler valor."); setResultado([]); return; }
    if (valorInicial <= 0) { if (valorProduto !== '0') Alert.alert("Atenção", "Valor zerado ou inválido."); setResultado([]); setLoading(false); return; }
    const resultados: ResultadoParcela[] = []; const entrada = temEntrada ? Math.max(0, parseFloat(valorEntrada.replace(',', '.')) || 0) : 0; const formatCurrency = (num: number) => `R$${num.toFixed(2).replace('.', ',')}`;
    Object.keys(parcelas).forEach((key) => {
      const parcelaInfo = parcelas[key]; const qtdParcelas = parseInt(key.split('+')[1].replace('X', ''));
      const jurosAplicado = selectedTabela === 'c' ? parcelaInfo.jrdia : parcelaInfo.pmeta; const valorBaseParaCalculo = valorInicial * (1 + jurosAplicado / 100);
      const valorRestante = valorBaseParaCalculo - entrada;
      if (valorRestante > 1e-6) { const valorParcelado = valorRestante / qtdParcelas; if (!temEntrada || entrada >= (valorParcelado - 1e-6)) { resultados.push({ entrada: formatCurrency(entrada), parcelas: `${qtdParcelas}x`, valor: formatCurrency(valorParcelado) }); } }
    });
    setResultado(resultados); setLoading(false);
  };
  const handleSelecionarTabela = (tabela: TabelaType) => { setSelectedTabela(tabela); setResultado([]); };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.calculatorContainer}>
          <Text style={styles.calculatorTitle}>SabidoPay 1.0 - Nosso Lar</Text>
          <View style={styles.calculatorDisplayContainer}>
            <Text style={styles.calculatorPreviousValue}>{calcPreviousValue} {calcOperator}</Text>
            <Text style={styles.calculatorDisplay} numberOfLines={1} ellipsizeMode="head">{calcDisplay}</Text>
          </View>
          <View style={styles.calculatorRow}>
            <TouchableOpacity style={styles.calcButtonClear} onPress={clearCalculator}><Text style={styles.calcButtonClearText}>C</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.calcButtonTable, selectedTabela === 'c' ? styles.calcButtonTableActive : styles.calcButtonTableInactive]} onPress={() => handleSelecionarTabela('c')}><Text style={styles.calcButtonTableText}>T. Cheia</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.calcButtonTable, selectedTabela === 'm' ? styles.calcButtonTableActive : styles.calcButtonTableInactive]} onPress={() => handleSelecionarTabela('m')}><Text style={styles.calcButtonTableText}>T. Metade</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButtonOp} onPress={() => handleCalcOperatorInput('/')}><Text style={styles.calcButtonOpText}>/</Text></TouchableOpacity>
          </View>
          <View style={styles.calculatorRow}>
            <TouchableOpacity style={styles.calcButton} onPress={() => handleCalcNumberInput('7')}><Text style={styles.calcButtonText}>7</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButton} onPress={() => handleCalcNumberInput('8')}><Text style={styles.calcButtonText}>8</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButton} onPress={() => handleCalcNumberInput('9')}><Text style={styles.calcButtonText}>9</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButtonOp} onPress={() => handleCalcOperatorInput('*')}><Text style={styles.calcButtonOpText}>*</Text></TouchableOpacity>
          </View>
          <View style={styles.calculatorRow}>
            <TouchableOpacity style={styles.calcButton} onPress={() => handleCalcNumberInput('4')}><Text style={styles.calcButtonText}>4</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButton} onPress={() => handleCalcNumberInput('5')}><Text style={styles.calcButtonText}>5</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButton} onPress={() => handleCalcNumberInput('6')}><Text style={styles.calcButtonText}>6</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButtonOp} onPress={() => handleCalcOperatorInput('-')}><Text style={styles.calcButtonOpText}>-</Text></TouchableOpacity>
          </View>
          <View style={styles.calculatorRow}>
            <TouchableOpacity style={styles.calcButton} onPress={() => handleCalcNumberInput('1')}><Text style={styles.calcButtonText}>1</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButton} onPress={() => handleCalcNumberInput('2')}><Text style={styles.calcButtonText}>2</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButton} onPress={() => handleCalcNumberInput('3')}><Text style={styles.calcButtonText}>3</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButtonOp} onPress={() => handleCalcOperatorInput('+')}><Text style={styles.calcButtonOpText}>+</Text></TouchableOpacity>
          </View>
          <View style={styles.calculatorRow}>
            <TouchableOpacity style={styles.calcButton} onPress={() => handleCalcNumberInput('0')}><Text style={styles.calcButtonText}>0</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButton} onPress={handleCalcDecimalInput}><Text style={styles.calcButtonText}>.</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButtonOp} onPress={handleBackspace}><Text style={styles.calcButtonOpText}>←</Text></TouchableOpacity>
            <TouchableOpacity style={styles.calcButtonEquals} onPress={handleCalcEquals}><Text style={styles.calcButtonEqualsText}>=</Text></TouchableOpacity>
          </View>
          {temEntrada && (
            <TextInput
              placeholder="Valor da Entrada"
              placeholderTextColor="#546E7A"
              keyboardType="numeric"
              value={valorEntrada}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9,.]/g, ''); const parts = cleaned.split(/[.,]/);
                let validatedValue = cleaned; if (parts.length > 2) { validatedValue = parts[0] + '.' + parts.slice(1).join(''); }
                setValorEntrada(validatedValue.replace(',', '.'));
              }}
              style={styles.entradaInput}
            />
          )}
          <View style={styles.bottomActionRow}>
            <TouchableOpacity style={[styles.calcActionButton, { marginRight: 5 }, temEntrada ? styles.ativoEntrada : styles.inativoEntrada]} onPress={() => setTemEntrada(!temEntrada)}>
              <Text style={styles.calcActionButtonText}>{temEntrada ? 'Rem. Entrada' : 'Add Entrada'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.calcActionButton, styles.calcularButtonColor, { marginLeft: 5 }]} onPress={calcularParcela} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.calcActionButtonText}>Calcular</Text>}
            </TouchableOpacity>
          </View>
        </View>
        {resultado.length > 0 && (
          <View style={styles.resultBox}>
            <View style={styles.tableHeader}><Text style={styles.tableHeaderText}>Entrada</Text><Text style={styles.tableHeaderText}>Parcelas</Text><Text style={styles.tableHeaderText}>Valor</Text></View>
            {resultado.map((item, index) => (
              <View key={index} style={styles.tableRow}><Text style={styles.tableCell}>{item.entrada}</Text><Text style={styles.tableCell}>{item.parcelas}</Text><Text style={styles.tableCell}>{item.valor}</Text></View>
            ))}
          </View>
        )}
        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F9FAFB' },
  ativoEntrada: { backgroundColor: '#E74C3C' },
  inativoEntrada: { backgroundColor: '#2ECC71' },
  resultBox: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginTop: 25, borderColor: '#EEE', borderWidth: 1, elevation: 2, marginBottom: 20 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#ccc', paddingBottom: 6, marginBottom: 6 },
  tableHeaderText: { fontWeight: 'bold', fontSize: 15, width: '33%', textAlign: 'center', color: '#333' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0', alignItems: 'center' },
  tableCell: { width: '33%', textAlign: 'center', fontSize: 14, color: '#333' },
  calculatorContainer: { marginBottom: 20, backgroundColor: '#ECEFF1', borderRadius: 6, padding: 18, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
  calculatorTitle: { fontSize: 19, fontWeight: 'bold', color: '#37474F', marginBottom: 12, textAlign: 'center' },
  calculatorDisplayContainer: { backgroundColor: '#CFD8DC', borderRadius: 6, paddingVertical: 14, paddingHorizontal: 15, marginBottom: 18, flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' },
  calculatorPreviousValue: { fontSize: 16, color: '#263238', textAlign: 'right', fontWeight: '300' },
  calculatorDisplay: { fontSize: 38, color: '#263238', textAlign: 'right', fontWeight: '500', flexShrink: 1 },
  calculatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around', 
    marginBottom: 14,
    alignItems: 'center',
  },
  calcButton: {
    flex: 1, 
    aspectRatio: 1,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    backgroundColor: '#B0BEC5',
    marginHorizontal: 5, 
  },
  calcButtonText: { fontSize: 26, fontWeight: 'bold', color: '#37474F' },
  calcButtonOp: {
    flex: 1, 
    aspectRatio: 1,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    backgroundColor: '#78909C',
    marginHorizontal: 5, 
  },
  calcButtonOpText: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  calcButtonClear: {
    flex: 1, // 
    aspectRatio: 1,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    backgroundColor: '#EF5350',
    marginHorizontal: 5, 
  },
  calcButtonClearText: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  calcButtonEquals: {
    flex: 1, 
    aspectRatio: 1,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    backgroundColor: '#42A5F5',
    marginHorizontal: 5, 
  },
  calcButtonEqualsText: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  calcButtonTable: {
    flex: 1, 
    aspectRatio: 1,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    backgroundColor: '#90A4AE',
    borderWidth: 2,
    borderColor: 'transparent',
    marginHorizontal: 5, 
  },
  calcButtonTableActive: { borderColor: '#E74C3C' },
  calcButtonTableInactive: { borderColor: 'transparent' },
  calcButtonTableText: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  entradaInput: { backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#B0BEC5', padding: 12, fontSize: 16, color: '#37474F', marginBottom: 15, width: '100%' },
  bottomActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calcActionButton: { flex: 1, paddingVertical: 15, borderRadius: 5, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  calcActionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    calcularButtonColor: { backgroundColor: '#3498db' },
});

export default JurosCalculatorScreen;