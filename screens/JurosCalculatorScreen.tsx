import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Animated,
    LayoutAnimation,
    UIManager,
    Linking
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const formatCurrency = (num: number): string => {
    try {
        return parseFloat(num.toFixed(2)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } catch (e) {
        console.error("Erro ao formatar moeda:", e);
        return `R$ ${num.toFixed(2).replace('.', ',')}`;
    }
};

const parcelasData: { [key: string]: { jrdia: number; pmeta: number } } = {
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

type TabelaType = 'c' | 'm';
type ResultadoParcela = { entrada: string; parcelas: string; valor: string };

const JurosCalculatorScreen = () => {
    const [calcDisplay, setCalcDisplay] = useState('0');
    const [calcOperator, setCalcOperator] = useState<string | null>(null);
    const [calcPreviousValue, setCalcPreviousValue] = useState<string | null>(null);
    const [waitingForOperand, setWaitingForOperand] = useState(false);

    const [valorProduto, setValorProduto] = useState('0');
    const [selectedTabela, setSelectedTabela] = useState<TabelaType>('c');
    const [temEntrada, setTemEntrada] = useState(false);
    const [valorEntrada, setValorEntrada] = useState('');

    const [resultado, setResultado] = useState<ResultadoParcela[]>([]);
    const [loading, setLoading] = useState(false);
    const [nomeCliente, setNomeCliente] = useState('');
    const [nomeProdutoServico, setNomeProdutoServico] = useState('');
    const [dataOrcamento, setDataOrcamento] = useState(new Date().toLocaleDateString('pt-BR'));
    const [parcelaInicialPdf, setParcelaInicialPdf] = useState('2');
    const [parcelaFinalPdf, setParcelaFinalPdf] = useState('24');
    const [nomeVendedor, setNomeVendedor] = useState('');

    const [showResults, setShowResults] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        const cleanedDisplay = calcDisplay.replace(/[^0-9,.]/g, '');
        setValorProduto(cleanedDisplay.replace(',', '.'));
    }, [calcDisplay]);

    useEffect(() => {
        if (resultado.length > 0) {
            setShowResults(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        } else {
            setShowResults(false);
            fadeAnim.setValue(0);
        }
         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [resultado]);

    const handleCalcNumberInput = (num: string) => {
        if (waitingForOperand) {
            setCalcDisplay(num);
            setWaitingForOperand(false);
        } else if (calcDisplay.length < 15) {
            setCalcDisplay(calcDisplay === '0' ? num : calcDisplay + num);
        }
    };

    const handleCalcDecimalInput = () => {
        if (waitingForOperand) {
            setCalcDisplay('0.');
            setWaitingForOperand(false);
        } else if (!calcDisplay.includes('.') && calcDisplay.length < 15) {
            setCalcDisplay(calcDisplay + '.');
        }
    };

    const performCalculation = (): number => {
        const currentValue = parseFloat(calcDisplay);
        const prevValue = parseFloat(calcPreviousValue ?? '0');

        if (calcOperator && calcPreviousValue !== null && !isNaN(currentValue) && !isNaN(prevValue)) {
            let result = 0;
            switch (calcOperator) {
                case '+': result = prevValue + currentValue; break;
                case '-': result = prevValue - currentValue; break;
                case '*': result = prevValue * currentValue; break;
                case '/':
                    if (currentValue === 0) {
                        Alert.alert("Erro", "Divisão por zero.");
                        return NaN;
                    }
                    result = prevValue / currentValue;
                    break;
                default: return currentValue;
            }
            const resultString = String(parseFloat(result.toPrecision(12)));
            return parseFloat(resultString);
        }
        return isNaN(currentValue) ? 0 : currentValue;
    };

    const handleCalcOperatorInput = (op: string) => {
        const currentValue = parseFloat(calcDisplay);
        if (isNaN(currentValue)) return;

        if (calcOperator && !waitingForOperand) {
            const intermediateResult = performCalculation();
            if (isNaN(intermediateResult)) return;
            const resultStr = String(intermediateResult);
            setCalcDisplay(resultStr);
            setCalcPreviousValue(resultStr);
        } else {
            setCalcPreviousValue(calcDisplay);
        }
        setCalcOperator(op);
        setWaitingForOperand(true);
    };

    const handleCalcEquals = () => {
        if (!calcOperator || !calcPreviousValue) return;

        const resultValue = performCalculation();
        if (isNaN(resultValue)) return;

        const resultStr = String(resultValue);
        setCalcDisplay(resultStr);
        setCalcOperator(null);
        setCalcPreviousValue(null);
        setWaitingForOperand(false);
    };

    const clearCalculator = () => {
        setCalcDisplay('0');
        setCalcOperator(null);
        setCalcPreviousValue(null);
        setWaitingForOperand(false);
        setValorProduto('0');
        setResultado([]);
    };

    const handleBackspace = () => {
        if (waitingForOperand) return;

        if (calcDisplay.length > 1) {
            setCalcDisplay(calcDisplay.slice(0, -1));
        } else if (calcDisplay !== '0') {
            setCalcDisplay('0');
        }
    };

    const handleSelecionarTabela = (tabela: TabelaType) => {
        setSelectedTabela(tabela);
        setResultado([]);
    };

    const calcularParcela = () => {
        setLoading(true);
        setResultado([]);

        let valorInicial = 0;
        try {
            const parsedValue = parseFloat(valorProduto);
            if (isNaN(parsedValue)) throw new Error("Valor do produto inválido.");
            valorInicial = Math.max(0, parsedValue);
        } catch (error: any) {
            setLoading(false);
            Alert.alert("Erro", "Erro ao ler valor do produto.");
            return;
        }

        if (valorInicial <= 0) {
             if (valorProduto !== '0') Alert.alert("Atenção", "Valor do produto zerado ou inválido.");
            setLoading(false);
            return;
        }

        let entradaNum = 0;
        if (temEntrada) {
            try {
                const parsedEntrada = parseFloat(valorEntrada.replace(',', '.') || '0');
                 if (isNaN(parsedEntrada) && valorEntrada.trim() !== '') {
                     throw new Error("Valor da entrada inválido.");
                 }
                entradaNum = Math.max(0, parsedEntrada);
            } catch (error: any) {
                setLoading(false);
                 Alert.alert("Erro", "Erro ao ler valor da entrada: " + error.message);
                return;
            }
        }

        const resultadosCalculados: ResultadoParcela[] = [];

        Object.keys(parcelasData).forEach((key) => {
            const parcelaInfo = parcelasData[key];
            const qtdParcelas = parseInt(key.split('+')[1].replace('X', ''));
            const jurosAplicado = selectedTabela === 'c' ? parcelaInfo.jrdia : parcelaInfo.pmeta;
            const valorComJuros = valorInicial * (1 + jurosAplicado / 100);
            const valorRestante = valorComJuros - entradaNum;

             if (qtdParcelas === 1 && valorRestante <= 1e-6) {
                  resultadosCalculados.push({
                      entrada: formatCurrency(entradaNum),
                      parcelas: `1x`,
                      valor: formatCurrency(0)
                  });
             } else if (valorRestante > 1e-6) {
                 if (entradaNum < valorComJuros - 1e-6) {
                     const valorParcelado = valorRestante / qtdParcelas;
                     resultadosCalculados.push({
                         entrada: formatCurrency(entradaNum),
                         parcelas: `${qtdParcelas}x`,
                         valor: formatCurrency(valorParcelado)
                     });
                 }
             }
        });

         resultadosCalculados.sort((a, b) => {
             const numA = parseInt(a.parcelas.replace('x', ''));
             const numB = parseInt(b.parcelas.replace('x', ''));
             return numA - numB;
         });


        setTimeout(() => {
            setResultado(resultadosCalculados);
            setLoading(false);
        }, 300);
    };

    const gerarHtmlOrcamento = (
        cliente: string,
        produtoServico: string,
        data: string,
        resultados: ResultadoParcela[],
        valorOriginal: string,
        valorEntrada: string,
        temEntrada: boolean,
        vendedor: string
    ): string => {
        const tableHeaderHtml = temEntrada ? `
            <thead>
                <tr>
                    <th>Plano</th>
                    <th>Valor</th>
                </tr>
            </thead>
        ` : `
            <thead>
                <tr>
                    <th>Parcelas</th>
                    <th>Valor da Parcela</th>
                </tr>
            </thead>
        `;

        const tableRowsHtml = resultados.map(item => {
            if (temEntrada) {
                const numParcelas = parseInt(item.parcelas.replace('x', ''));
                return `
                    <tr>
                        <td style="text-align: center; padding: 10px; border-bottom: 1px solid #eee;">Entrada de ${item.entrada} + ${numParcelas}x</td>
                        <td style="text-align: center; padding: 10px; border-bottom: 1px solid #eee;">${item.valor}</td>
                    </tr>
                `;
            } else {
                return `
                    <tr>
                        <td style="text-align: center; padding: 10px; border-bottom: 1px solid #eee;">${item.parcelas}</td>
                        <td style="text-align: center; padding: 10px; border-bottom: 1px solid #eee;">${item.valor}</td>
                    </tr>
                `;
            }
        }).join('');

        // Texto para compartilhamento via WhatsApp
        const whatsappText = encodeURIComponent(`Orçamento para: ${cliente}\nProduto: ${produtoServico}\nData: ${data}\nVendedor: ${vendedor}\n\nOpções de Parcelamento:\n${resultados.map(item => {
            if (temEntrada) {
                const numParcelas = parseInt(item.parcelas.replace('x', ''));
                return `Entrada de ${item.entrada} + ${numParcelas}x de ${item.valor}`;
            } else {
                return `${item.parcelas} de ${item.valor}`;
            }
        }).join('\n')}\n\n_Gerado por SabidoPay Calculadora_`);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
                <title>Orçamento - ${cliente}</title>
                <style>
                    body { 
                        font-family: 'Helvetica Neue', Arial, sans-serif; 
                        margin: 20px; 
                        color: #333; 
                        background-color: #f9f9f9;
                    }
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                        background-color: white;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    h1 {
                        text-align: center;
                        color: #004D40;
                        margin-top: 10px;
                        margin-bottom: 30px;
                        font-size: 24px;
                        font-weight: bold;
                    }
                    .info {
                        margin-bottom: 30px;
                        font-size: 16px;
                        color: #333;
                        line-height: 1.6;
                        background-color: #f5f5f5;
                        padding: 20px;
                        border-radius: 6px;
                    }
                    .info p { margin: 8px 0; }
                    .info strong { 
                        color: #004D40; 
                        font-weight: 600;
                        display: inline-block;
                        width: 100px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                        border-radius: 5px;
                        overflow: hidden;
                    }
                    th, td {
                        padding: 15px 10px;
                        text-align: center;
                    }
                    th {
                        background-color: #00796B;
                        color: white;
                        font-size: 14px;
                        font-weight: 700;
                        text-transform: uppercase;
                        border-bottom: none;
                    }
                    td {
                        border-bottom: 1px solid #eee;
                        font-size: 15px;
                        color: #333;
                    }
                    tr:last-child td {
                        border-bottom: none;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    tr:hover {
                        background-color: #f0f0f0;
                    }

                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                        color: #777;
                        font-size: 12px;
                    }
                    
                    .watermark {
                        text-align: center;
                        margin-top: 30px;
                        margin-bottom: 30px;
                        font-size: 11px;
                        color: #aaa;
                        font-style: italic;
                    }
                    
                    .share-buttons {
                        display: flex;
                        justify-content: center;
                        margin-top: 30px;
                        flex-wrap: wrap;
                        gap: 15px;
                    }
                    
                    .share-button {
                        display: inline-block;
                        padding: 12px 24px;
                        border-radius: 50px;
                        text-decoration: none;
                        color: white;
                        font-weight: bold;
                        text-align: center;
                        transition: all 0.3s ease;
                        min-width: 180px;
                    }
                    
                    .whatsapp {
                        background-color: #25D366;
                    }
                    
                    .whatsapp:hover {
                        background-color: #128C7E;
                    }
                    
                    .email {
                        background-color: #D44638;
                    }
                    
                    .email:hover {
                        background-color: #B23121;
                    }
                    
                    .print {
                        background-color: #546E7A;
                    }
                    
                    .print:hover {
                        background-color: #37474F;
                    }
                    
                    @media print {
                        .share-buttons {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Simulação de Parcelamento</h1>
                    <div class="info">
                        <p><strong>Cliente:</strong> ${cliente || 'Não informado'}</p>
                        <p><strong>Produto:</strong> ${produtoServico || 'Não informado'}</p>
                        <p><strong>Data:</strong> ${data || 'Não informada'}</p>
                        <p><strong>Vendedor:</strong> ${vendedor || 'Não informado'}</p>
                    </div>
                    
                    <table>
                        ${tableHeaderHtml}
                        <tbody>
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        * Valores sujeitos à análise de crédito e aprovação.
                    </div>
                    
                    <div class="share-buttons">
                        <a href="https://wa.me/?text=${whatsappText}" target="_blank" class="share-button whatsapp">
                            Compartilhar via WhatsApp
                        </a>
                        <a href="mailto:?subject=Orçamento: ${produtoServico}&body=${whatsappText}" class="share-button email">
                            Enviar por E-mail
                        </a>
                        <a href="#" onclick="window.print(); return false;" class="share-button print">
                            Imprimir / Salvar PDF
                        </a>
                    </div>
                    
                    <div class="watermark">
                        Gerado por SabidoPay Calculadora. Todos os direitos reservados.
                    </div>
                </div>
                
                <script>
                    // Verificar se o navegador suporta Web Share API
                    if (navigator.share) {
                        document.addEventListener('DOMContentLoaded', function() {
                            // Adicionar botão de compartilhamento nativo
                            var shareContainer = document.querySelector('.share-buttons');
                            var shareButton = document.createElement('a');
                            shareButton.href = '#';
                            shareButton.className = 'share-button';
                            shareButton.style.backgroundColor = '#1976D2';
                            shareButton.textContent = 'Compartilhar (Nativo)';
                            
                            shareButton.addEventListener('click', function(e) {
                                e.preventDefault();
                                
                                navigator.share({
                                    title: 'Orçamento: ${produtoServico}',
                                    text: '${whatsappText.replace(/\\n/g, ' ')}',
                                    url: window.location.href
                                })
                                .catch(console.error);
                            });
                            
                            shareContainer.appendChild(shareButton);
                        });
                    }
                </script>
            </body>
            </html>
        `;
    };

    // Função para compartilhar diretamente via WhatsApp
    const compartilharViaWhatsApp = (resultados: ResultadoParcela[]) => {
        // Texto para compartilhamento via WhatsApp
        const whatsappText = encodeURIComponent(`Orçamento para: ${nomeCliente}\nProduto: ${nomeProdutoServico}\nData: ${dataOrcamento}\nVendedor: ${nomeVendedor}\n\nOpções de Parcelamento:\n${resultados.map(item => {
            if (temEntrada) {
                const numParcelas = parseInt(item.parcelas.replace('x', ''));
                return `Entrada de ${item.entrada} + ${numParcelas}x de ${item.valor}`;
            } else {
                return `${item.parcelas} de ${item.valor}`;
            }
        }).join('\n')}\n\n_Gerado por SabidoPay Calculadora_`);
        
        const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
        
        // Abrir WhatsApp
        Linking.canOpenURL(whatsappUrl)
            .then(supported => {
                if (supported) {
                    return Linking.openURL(whatsappUrl);
                } else {
                    Alert.alert("Erro", "WhatsApp não está instalado ou não pode ser aberto.");
                }
            })
            .catch(err => Alert.alert("Erro", "Não foi possível abrir o WhatsApp."));
    };

    const gerarPdfECompartilhar = async () => {
        if (!nomeCliente.trim() || !nomeProdutoServico.trim() || !nomeVendedor.trim()) {
            Alert.alert("Atenção", "Por favor, preencha o nome do cliente, o produto/serviço e o nome do vendedor.");
            return;
        }
        if (resultado.length === 0) {
            Alert.alert("Atenção", "Calcule as parcelas primeiro para gerar o orçamento.");
            return;
        }

        const inicio = parseInt(parcelaInicialPdf);
        const fim = parseInt(parcelaFinalPdf);

        if (isNaN(inicio) || isNaN(fim) || inicio < 1 || fim < inicio || inicio > 24 || fim > 24) {
             Alert.alert("Atenção", "Por favor, defina um intervalo de parcelas válido para o PDF (ex: de 1 a 24).");
             return;
         }

        const resultadosFiltrados = resultado.filter(item => {
            const numParcelas = parseInt(item.parcelas.replace('x', ''));
            return numParcelas >= inicio && numParcelas <= fim;
        });

        if (resultadosFiltrados.length === 0) {
            Alert.alert("Atenção", `Nenhuma opção de parcelamento encontrada entre ${inicio}x e ${fim}x com os cálculos atuais para incluir no PDF.`);
            return;
        }

        resultadosFiltrados.sort((a, b) => {
            const numA = parseInt(a.parcelas.replace('x', ''));
            const numB = parseInt(b.parcelas.replace('x', ''));
            return numA - numB;
        });

        try {
            setLoading(true);
            
            // Abordagem específica para web - compartilhar diretamente via WhatsApp
            if (Platform.OS === 'web') {
                // Compartilhar diretamente via WhatsApp
                compartilharViaWhatsApp(resultadosFiltrados);
                setLoading(false);
                return;
            }
            
            // Para dispositivos móveis, usar expo-print e expo-sharing
            const htmlContent = gerarHtmlOrcamento(
                nomeCliente,
                nomeProdutoServico,
                dataOrcamento,
                resultadosFiltrados,
                valorProduto,
                valorEntrada,
                temEntrada,
                nomeVendedor
            );
            
            const { uri } = await Print.printToFileAsync({ 
                html: htmlContent, 
                base64: false 
            });

            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert("Erro", "Compartilhamento não está disponível neste dispositivo.");
                setLoading(false);
                return;
            }

            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Compartilhar Orçamento PDF',
                UTI: '.pdf'
            });

        } catch (error) {
            console.error("Erro ao gerar ou compartilhar PDF:", error);
            Alert.alert("Erro", "Não foi possível gerar ou compartilhar o PDF.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.calculatorContainer}>
                    <Text style={styles.calculatorTitle}>SabidoPay Calculadora</Text>
                    <View style={styles.calculatorDisplayContainer}>
                        <Text style={styles.calculatorPreviousValue}>
                            {calcPreviousValue !== null && calcOperator !== null ? `${calcPreviousValue.replace('.', ',')} ${calcOperator}` : ''}
                        </Text>
                        <Text style={styles.calculatorDisplay} numberOfLines={1} ellipsizeMode="head">
                            {calcDisplay.replace('.', ',')}
                        </Text>
                    </View>
                    <View style={styles.calculatorRow}>
                        <Pressable style={({ pressed }) => [styles.calcButtonClear, pressed && styles.calcButtonPressed]} onPress={clearCalculator}>
                            <Text style={styles.calcButtonClearText}>C</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonTable, selectedTabela === 'c' ? styles.calcButtonTableActive : styles.calcButtonTableInactive, pressed && styles.calcButtonPressed]} onPress={() => handleSelecionarTabela('c')}>
                            <Text style={styles.calcButtonTableText}> % Cheia</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonTable, selectedTabela === 'm' ? styles.calcButtonTableActive : styles.calcButtonTableInactive, pressed && styles.calcButtonPressed]} onPress={() => handleSelecionarTabela('m')}>
                            <Text style={styles.calcButtonTableText}>% Metade</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonOp, pressed && styles.calcButtonPressed]} onPress={() => handleCalcOperatorInput('/')}>
                            <Text style={styles.calcButtonOpText}>/</Text>
                        </Pressable>
                    </View>
                    <View style={styles.calculatorRow}>
                        <Pressable style={({ pressed }) => [styles.calcButtonNum, pressed && styles.calcButtonPressed]} onPress={() => handleCalcNumberInput('7')}>
                            <Text style={styles.calcButtonNumText}>7</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonNum, pressed && styles.calcButtonPressed]} onPress={() => handleCalcNumberInput('8')}>
                            <Text style={styles.calcButtonNumText}>8</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonNum, pressed && styles.calcButtonPressed]} onPress={() => handleCalcNumberInput('9')}>
                            <Text style={styles.calcButtonNumText}>9</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonOp, pressed && styles.calcButtonPressed]} onPress={() => handleCalcOperatorInput('*')}>
                            <Text style={styles.calcButtonOpText}>*</Text>
                        </Pressable>
                    </View>
                    <View style={styles.calculatorRow}>
                        <Pressable style={({ pressed }) => [styles.calcButtonNum, pressed && styles.calcButtonPressed]} onPress={() => handleCalcNumberInput('4')}>
                            <Text style={styles.calcButtonNumText}>4</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonNum, pressed && styles.calcButtonPressed]} onPress={() => handleCalcNumberInput('5')}>
                            <Text style={styles.calcButtonNumText}>5</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonNum, pressed && styles.calcButtonPressed]} onPress={() => handleCalcNumberInput('6')}>
                            <Text style={styles.calcButtonNumText}>6</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonOp, pressed && styles.calcButtonPressed]} onPress={() => handleCalcOperatorInput('-')}>
                            <Text style={styles.calcButtonOpText}>-</Text>
                        </Pressable>
                    </View>
                    <View style={styles.calculatorRow}>
                        <Pressable style={({ pressed }) => [styles.calcButtonNum, pressed && styles.calcButtonPressed]} onPress={() => handleCalcNumberInput('1')}>
                            <Text style={styles.calcButtonNumText}>1</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonNum, pressed && styles.calcButtonPressed]} onPress={() => handleCalcNumberInput('2')}>
                            <Text style={styles.calcButtonNumText}>2</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonNum, pressed && styles.calcButtonPressed]} onPress={() => handleCalcNumberInput('3')}>
                            <Text style={styles.calcButtonNumText}>3</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonOp, pressed && styles.calcButtonPressed]} onPress={() => handleCalcOperatorInput('+')}>
                            <Text style={styles.calcButtonOpText}>+</Text>
                        </Pressable>
                    </View>
                    <View style={styles.calculatorRow}>
                        <Pressable style={({ pressed }) => [styles.calcButtonNum, pressed && styles.calcButtonPressed]} onPress={() => handleCalcNumberInput('0')}>
                            <Text style={styles.calcButtonNumText}>0</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonNum, pressed && styles.calcButtonPressed]} onPress={handleCalcDecimalInput}>
                            <Text style={styles.calcButtonNumText}>,</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonNum, pressed && styles.calcButtonPressed]} onPress={handleBackspace}>
                            <Text style={styles.calcButtonNumText}>←</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.calcButtonEquals, pressed && styles.calcButtonPressed]} onPress={handleCalcEquals}>
                            <Text style={styles.calcButtonEqualsText}>=</Text>
                        </Pressable>
                    </View>

                    <View style={styles.bottomActionRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.checkboxContainer,
                                    pressed && { opacity: 0.7 }
                                ]}
                                onPress={() => setTemEntrada(!temEntrada)}
                            >
                                <View style={[styles.checkbox, temEntrada && styles.checkboxChecked]}>
                                    {temEntrada && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <Text style={styles.checkboxLabel}>Adicionar Entrada</Text>
                            </Pressable>
                        </View>
                    </View>

                    {temEntrada && (
                        <TextInput
                            style={styles.entradaInput}
                            placeholder="Valor da Entrada"
                            keyboardType="numeric"
                            value={valorEntrada}
                            onChangeText={setValorEntrada}
                            placeholderTextColor="#B0BEC5"
                        />
                    )}

                    <Pressable
                        style={({ pressed }) => [
                            styles.calcActionButton,
                            styles.calcularButtonColor,
                            pressed && styles.calcActionButtonPressed,
                            loading && styles.calcActionButtonDisabled
                        ]}
                        onPress={calcularParcela}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ECEFF1" size="small" />
                        ) : (
                            <Text style={styles.calcActionButtonText}>Calcular Parcelas</Text>
                        )}
                    </Pressable>

                    {showResults && (
                        <Animated.View style={{ opacity: fadeAnim, marginTop: 25 }}>
                            <ScrollView horizontal={true} style={{ marginBottom: 15 }}>
                                <View>
                                    <View style={styles.tableHeader}>
                                        {temEntrada ? (
                                            <>
                                                <Text style={[styles.tableHeaderCell, { width: 200 }]}>Plano</Text>
                                                <Text style={[styles.tableHeaderCell, { width: 150 }]}>Valor</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Text style={[styles.tableHeaderCell, { width: 100 }]}>Parcelas</Text>
                                                <Text style={[styles.tableHeaderCell, { width: 150 }]}>Valor da Parcela</Text>
                                            </>
                                        )}
                                    </View>
                                    {resultado.map((item, index) => (
                                        <View key={index} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                                            {temEntrada ? (
                                                <>
                                                    <Text style={[styles.tableCell, { width: 200 }]}>
                                                        Entrada: {item.entrada} + {item.parcelas}
                                                    </Text>
                                                    <Text style={[styles.tableCell, { width: 150 }]}>{item.valor}</Text>
                                                </>
                                            ) : (
                                                <>
                                                    <Text style={[styles.tableCell, { width: 100 }]}>{item.parcelas}</Text>
                                                    <Text style={[styles.tableCell, { width: 150 }]}>{item.valor}</Text>
                                                </>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        </Animated.View>
                    )}

                <View style={styles.orcamentoContainer}>
                    <Text style={styles.orcamentoTitle}>Dados para Orçamento</Text>
                    <TextInput
                        style={styles.inputOrcamento}
                        placeholder="Nome do Cliente"
                        value={nomeCliente}
                        onChangeText={setNomeCliente}
                        placeholderTextColor="#B0BEC5"
                    />
                    <TextInput
                        style={styles.inputOrcamento}
                        placeholder="Produto/Serviço"
                        value={nomeProdutoServico}
                        onChangeText={setNomeProdutoServico}
                        placeholderTextColor="#B0BEC5"
                    />
                    <TextInput
                        style={styles.inputOrcamento}
                        placeholder="Nome do Vendedor"
                        value={nomeVendedor}
                        onChangeText={setNomeVendedor}
                        placeholderTextColor="#B0BEC5"
                    />
                    <TextInput
                        style={styles.inputOrcamento}
                        placeholder="Data do Orçamento (ex: DD/MM/AAAA)"
                        value={dataOrcamento}
                        onChangeText={setDataOrcamento}
                        placeholderTextColor="#B0BEC5"
                    />
                    <Text style={styles.labelIntervalo}>Intervalo de Parcelas para PDF:</Text>
                    <View style={styles.intervaloParcelasContainer}>
                        <TextInput
                            style={styles.inputIntervalo}
                            placeholder="De (ex: 2)"
                            keyboardType="numeric"
                            value={parcelaInicialPdf}
                            onChangeText={setParcelaInicialPdf}
                            placeholderTextColor="#B0BEC5"
                        />
                        <Text style={styles.intervaloLabel}>até</Text>
                        <TextInput
                            style={styles.inputIntervalo}
                            placeholder="Até (ex: 12)"
                            keyboardType="numeric"
                            value={parcelaFinalPdf}
                            onChangeText={setParcelaFinalPdf}
                            placeholderTextColor="#B0BEC5"
                        />
                    </View>
                    <Pressable
                        style={({ pressed }) => [
                            styles.calcActionButton,
                            styles.gerarPdfButton,
                            pressed && styles.calcActionButtonPressed,
                            loading && styles.calcActionButtonDisabled
                        ]}
                        onPress={gerarPdfECompartilhar}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ECEFF1" size="small" />
                        ) : (
                            <Text style={styles.calcActionButtonText}>Compartilhar via WhatsApp</Text>
                        )}
                    </Pressable>
                </View>

                <Text style={styles.copyrightText}>© 2025 SabidoPay Calculadora. Todos os direitos reservados.</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 20,
        backgroundColor: '#263238',
    },
    calculatorContainer: {
        backgroundColor: '#37474F',
        borderRadius: 16,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        marginBottom: 20,
        flex: 1,
    },
    calculatorTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#B0BEC5',
        marginBottom: 20,
        textAlign: 'center',
    },
    calculatorDisplayContainer: {
        backgroundColor: '#455A64',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    calculatorPreviousValue: {
        fontSize: 16,
        color: "#B0BEC5",
        textAlign: "right",
        marginBottom: 4,
        flexShrink: 1,
        flexWrap: 'wrap',
        minHeight: 26,
    },
    calculatorDisplay: {
        fontSize: 42,
        color: "#ECEFF1",
        textAlign: "right",
        fontWeight: "700",
        flexShrink: 1,
    },
    calculatorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
    calcButtonNum: { width: '23%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 3, backgroundColor: '#546E7A' },
    calcButtonNumText: { fontSize: 28, fontWeight: 'bold', color: '#ECEFF1' },
    calcButtonOp: { width: '23%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 3, backgroundColor: '#455A64' },
    calcButtonOpText: { fontSize: 28, fontWeight: 'bold', color: '#ECEFF1' },
    calcButtonClear: { width: '23%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 3, backgroundColor: '#D32F2F' },
    calcButtonClearText: { fontSize: 28, fontWeight: 'bold', color: '#ECEFF1' },
    calcButtonEquals: { width: '23%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 3, backgroundColor: '#1976D2' },
    calcButtonEqualsText: { fontSize: 28, fontWeight: 'bold', color: '#ECEFF1' },
    calcButtonTable: { width: '23%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 3, borderWidth: 2, borderColor: 'transparent' },
    calcButtonTableActive: { backgroundColor: '#004D40', borderColor: '#00796B' },
    calcButtonTableInactive: { backgroundColor: '#546E7A', borderColor: 'transparent' },
    calcButtonTableText: { fontSize: 13, fontWeight: 'bold', color: '#ECEFF1', textAlign: 'center' },
    entradaInput: { backgroundColor: '#455A64', borderColor: '#546E7A', borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 17, marginTop: 15, marginBottom: 15, color: '#ECEFF1', elevation: 1 },
    bottomActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    calcActionButton: { flex: 1, paddingVertical: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 3 },
    calcActionButtonText: { fontSize: 17, fontWeight: 'bold', color: '#ECEFF1' },
    calcularButtonColor: { backgroundColor: '#004D40' },
    orcamentoContainer: { 
        marginTop: 30, 
        padding: 20, 
        backgroundColor: '#37474F', 
        borderRadius: 10, 
        elevation: 4, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.35, 
        shadowRadius: 2.62, 
        marginBottom: 20 
    },
    orcamentoTitle: { fontSize: 19, fontWeight: 'bold', color: '#B0BEC5', marginBottom: 18, textAlign: 'center' },
    inputOrcamento: { backgroundColor: '#455A64', borderColor: '#546E7A', borderWidth: 1, borderRadius: 6, padding: 14, fontSize: 16, marginBottom: 14, color: '#ECEFF1' },
    labelIntervalo: { fontSize: 16, color: '#B0BEC5', marginTop: 8, marginBottom: 12 },
    intervaloParcelasContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 18,
        flexWrap: 'nowrap'
    },
    inputIntervalo: { 
        flex: 1, 
        maxWidth: '42%',
        backgroundColor: '#455A64', 
        borderColor: '#546E7A', 
        borderWidth: 1, 
        borderRadius: 6, 
        padding: 14, 
        fontSize: 16, 
        color: '#ECEFF1' 
    },
    intervaloLabel: { 
        fontSize: 16, 
        color: '#B0BEC5', 
        marginHorizontal: 10,
        textAlign: 'center',
        width: 40
    },
    gerarPdfButton: { backgroundColor: '#25D366' }, // Cor do WhatsApp
    calcButtonPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    calcActionButtonPressed: {
         opacity: 0.8,
         transform: [{ scale: 0.99 }],
    },
    calcActionButtonDisabled: {
        opacity: 0.4,
    },
    copyrightText: {
        fontSize: 10,
        color: '#90A4AE',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#B0BEC5',
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#004D40',
        borderColor: '#00796B',
    },
    checkmark: {
        color: '#ECEFF1',
        fontSize: 14,
        fontWeight: 'bold',
    },
    checkboxLabel: {
        fontSize: 16,
        color: '#ECEFF1',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#004D40',
        padding: 10,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    tableHeaderCell: {
        color: '#ECEFF1',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#455A64',
    },
    tableRowEven: {
        backgroundColor: '#455A64',
    },
    tableRowOdd: {
        backgroundColor: '#37474F',
    },
    tableCell: {
        color: '#ECEFF1',
        fontSize: 14,
        textAlign: 'center',
    },
});

export default JurosCalculatorScreen;
