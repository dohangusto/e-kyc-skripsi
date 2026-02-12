import 'package:flutter/material.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../ekyc_progress_store.dart';
import '../widgets/ekyc_progress_footer.dart';

class KtpOcrPage extends StatefulWidget {
  const KtpOcrPage({super.key});

  @override
  State<KtpOcrPage> createState() => _KtpOcrPageState();
}

class _KtpOcrPageState extends State<KtpOcrPage> {
  final _nikController = TextEditingController(text: '3175091201990001');
  final _nameController = TextEditingController(text: 'RIZKY PRATAMA');
  final _birthPlaceController = TextEditingController(text: 'Jakarta');
  DateTime? _birthDate = DateTime(1999, 1, 12);
  final _birthDateController = TextEditingController();
  String? _gender = 'Laki-laki';

  @override
  void initState() {
    super.initState();
    _birthDateController.text = _formatDate(_birthDate);
  }

  @override
  void dispose() {
    _nikController.dispose();
    _nameController.dispose();
    _birthPlaceController.dispose();
    _birthDateController.dispose();
    super.dispose();
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final initial = _birthDate ?? DateTime(now.year - 20, 1, 1);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900, 1, 1),
      lastDate: DateTime(now.year - 10, 12, 31),
    );
    if (picked != null) {
      setState(() {
        _birthDate = picked;
        _birthDateController.text = _formatDate(picked);
      });
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '';
    return '${date.day.toString().padLeft(2, '0')}-${date.month.toString().padLeft(2, '0')}-${date.year}';
  }

  void _goNext() {
    EkycProgressStore.setStatus('ktp', EkycStepStatus.done);
    if (EkycProgressStore.statusOf('identity') != EkycStepStatus.done) {
      EkycProgressStore.setStatus('identity', EkycStepStatus.inProgress);
    }
    Navigator.of(context).pushReplacementNamed(AppRoutes.identityForm);
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        EkycProgressStore.setStatus('ktp', EkycStepStatus.pending);
        return true;
      },
      child: Scaffold(
        backgroundColor: AppColors.surface,
        appBar: AppBar(
          title: const Text('Foto KTP'),
          centerTitle: false,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              EkycProgressStore.setStatus('ktp', EkycStepStatus.pending);
              Navigator.of(context).maybePop();
            },
          ),
        ),
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(
                    Dimens.spacing16,
                    Dimens.spacing12,
                    Dimens.spacing16,
                    Dimens.spacing16,
                  ),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 520),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Pastikan detail KTP-mu sudah sesuai',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: Dimens.spacing16),
                          TextFormField(
                            controller: _nikController,
                            readOnly: true,
                            decoration: const InputDecoration(
                              labelText: 'Nomor KTP',
                              helperText: 'Pastikan nomor KTP kamu benar',
                            ),
                          ),
                          const SizedBox(height: Dimens.spacing12),
                          TextFormField(
                            controller: _nameController,
                            readOnly: true,
                            decoration: const InputDecoration(
                              labelText: 'Nama lengkap',
                            ),
                          ),
                          const SizedBox(height: Dimens.spacing12),
                          TextFormField(
                            controller: _birthPlaceController,
                            decoration: const InputDecoration(
                              labelText: 'Tempat lahir',
                            ),
                          ),
                          const SizedBox(height: Dimens.spacing12),
                          GestureDetector(
                            onTap: _pickBirthDate,
                            child: AbsorbPointer(
                              child: TextFormField(
                                controller: _birthDateController,
                                decoration: const InputDecoration(
                                  labelText: 'Tanggal lahir',
                                  suffixIcon: Icon(Icons.date_range_outlined),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: Dimens.spacing12),
                          DropdownButtonFormField<String>(
                            value: _gender,
                            decoration: const InputDecoration(
                              labelText: 'Jenis kelamin',
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'Laki-laki',
                                child: Text('Laki-laki'),
                              ),
                              DropdownMenuItem(
                                value: 'Perempuan',
                                child: Text('Perempuan'),
                              ),
                            ],
                            onChanged: (value) =>
                                setState(() => _gender = value),
                          ),
                          const SizedBox(height: Dimens.spacing24),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              EkycProgressFooter(
                title: 'Foto KTP',
                currentStep: 2,
                totalSteps: 2,
                enableAction: true,
                onAction: _goNext,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
